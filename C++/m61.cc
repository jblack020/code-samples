#include "m61.hh"
#include <cassert>
#include <cinttypes>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <map>
#include <sys/mman.h>

static m61_statistics gstats = {.nactive = 0,
                                .active_size = 0,
                                .ntotal = 0,
                                .total_size = 0,
                                .nfail = 0,
                                .fail_size = 0,
                                .heap_min = 0,
                                .heap_max = 0};

/// AllocationInfo
///    Contains the size, file, and line number of an allocation
///    Allows for easy access of metadata for active allocations
///    Reduces spaces and time complexity of storing and finding active
///    allocation metadata, since the other data is cached when one is accessed
///    and we are likely to access multiple points of metadata for a single
///    active allocation
struct AllocationInfo {
  size_t size;
  const char *file;
  int line;
};

/// Use a map to store active allocations, with the pointer as the key
/// and the allocation info as the value
typedef std::map<void *, AllocationInfo> ActiveAllocation;

/// Use a map to store freed allocations, with the pointer as the key
/// and the size as the value
typedef std::map<void *, size_t>
    FreedAllocation; // We don't need the other metadata
                     // for freed allocations, so a
                     // simple size_t will suffice

struct m61_memory_buffer {
  char *buffer;
  size_t pos = 0;
  size_t size;
  m61_memory_buffer(size_t requested_size = DEFAULT_ALLOC_BUFFER_SIZE);
  ~m61_memory_buffer();
};

static m61_memory_buffer default_buffer;

static ActiveAllocation active_allocations;
static FreedAllocation freed_allocations = {
    {default_buffer.buffer, default_buffer.size}};

static void *last_freed_ptr = nullptr;

/// Create a vector to store all the buffers
std::vector<m61_memory_buffer *> buffers = {&default_buffer};

/// Cleanup class to delete all non-default buffers at program exit
class BufferCleanup {
public:
  ~BufferCleanup() {
    for (auto buffer : buffers) {
      if (buffer != &default_buffer) { // Skip the default buffer
        delete buffer;
      }
    }
  }
};

static BufferCleanup buffer_cleanup;

const unsigned char CANARY[8] = {0xEE, 0xEE, 0xEE, 0xEE,
                                 0xEE, 0xEE, 0xEE, 0xEE};

const size_t CANARY_SZ = sizeof(CANARY);
const size_t ALIGNMENT = alignof(max_align_t);

m61_memory_buffer::m61_memory_buffer(size_t requested_size) {
  this->size = requested_size;
  void *buf = mmap(nullptr,    // Place the buffer at a random address
                   this->size, // Buffer should be 8 MiB big
                   PROT_WRITE, // We want to read and write the buffer
                   MAP_ANON | MAP_PRIVATE, -1, 0);
  // We want memory freshly allocated by the OS
  if (buf == MAP_FAILED) {
    this->buffer = nullptr;
    this->size = 0;
  } else {
    this->buffer = (char *)buf;
  }
}

m61_memory_buffer::~m61_memory_buffer() { munmap(this->buffer, this->size); };

/// align_size(sz)
///    Returns the size of the allocation rounded up to the nearest multiple of
///    the alignment, depending on the value of ALIGNMENT
static size_t align_size(size_t sz) {
  if (sz % ALIGNMENT != 0) {
    sz += ALIGNMENT - (sz % ALIGNMENT);
  }
  return sz;
}

/// m61_find_free_space(requested_size)
///    Finds a free space in the buffer that is at least as big as the requested
///    size, and returns a pointer to the start of the free space. If the space
///    is large enough, it will be split into two free blocks. If no such space
///    exists, returns nullptr.
static void *m61_find_free_space(size_t requested_size) {
  for (auto it = freed_allocations.begin(); it != freed_allocations.end();
       ++it) {
    size_t available_size = it->second;
    if (available_size >= requested_size) {
      void *ptr = it->first;
      it = freed_allocations.erase(it);
      // Split the block if it's significantly larger
      if (available_size >= requested_size + ALIGNMENT) {
        char *split_ptr = (char *)(ptr) + requested_size;
        freed_allocations[split_ptr] = available_size - requested_size;
      }
      return ptr;
    }
  }

  // If the requested size is greater than the default buffer size (indicating
  // a large allocation), create a new buffer and skip the search for free space
  if (requested_size >= DEFAULT_ALLOC_BUFFER_SIZE) {
    m61_memory_buffer *large_buffer = new m61_memory_buffer(requested_size);
    if (!large_buffer || !large_buffer->buffer) {
      delete large_buffer;
      return nullptr;
    }
    buffers.push_back(large_buffer);
    return large_buffer->buffer;
  }

  // For small allocations, create a new buffer if the current one is full,
  // and add it to the buffers
  m61_memory_buffer *new_buffer = new m61_memory_buffer();

  if (!new_buffer || !new_buffer->buffer) {
    delete new_buffer;
    return nullptr;
  }

  buffers.push_back(new_buffer);

  void *ptr = new_buffer->buffer;

  if (new_buffer->size >= requested_size) {
    // Free the remaining space after the allocation
    char *remaining_space = (char *)ptr + requested_size;
    size_t remaining_size = new_buffer->size - requested_size;
    freed_allocations[remaining_space] = remaining_size;
  }

  return ptr;
}

/// m61_malloc(sz, file, line)
///    Returns a pointer to `sz` bytes of freshly-allocated dynamic memory.
///    The memory is not initialized. If `sz == 0`, then m61_malloc may
///    return either `nullptr` or a pointer to a unique allocation.
///    The allocation request was made at source code location `file`:`line`.
void *m61_malloc(size_t sz, const char *file, int line) {
  if (sz == 0) {
    gstats.ntotal++;
    return nullptr;
  }

  // Align the size and find free space
  size_t total_sz = sz + CANARY_SZ;
  size_t aligned_sz = align_size(total_sz);
  void *ptr = m61_find_free_space(aligned_sz);

  // If no free space found or size overflowed, return nullptr & update
  if (ptr == nullptr || aligned_sz < sz) {
    gstats.nfail++;
    gstats.fail_size += sz;
    return nullptr;
  }

  active_allocations[ptr] = {sz, file, line};

  // Add canary code immediately after the user's allocation
  memcpy((char *)ptr + sz, CANARY, CANARY_SZ);

  // Update the counting and size statistics
  gstats.ntotal++;
  gstats.nactive++;
  gstats.active_size += sz;
  gstats.total_size += sz;

  if (gstats.heap_min == 0 || (uintptr_t)ptr < gstats.heap_min) {
    gstats.heap_min = (uintptr_t)ptr;
  }
  if ((uintptr_t)ptr + sz > gstats.heap_max) {
    gstats.heap_max = (uintptr_t)ptr + sz;
  }

  return ptr;
}

/// log_invalid_free(ptr, file, line)
///    Logs an error message containing the reason for the error, the pointer,
///    the line, and the file the error orginated in, if the free is invalid
void log_invalid_free(void *ptr, const char *file, int line) {
  bool double_free = last_freed_ptr == ptr ||
                     freed_allocations.find(ptr) != freed_allocations.end();
  bool in_heap_but_not_allocated =
      (uintptr_t)ptr >= gstats.heap_min && (uintptr_t)ptr < gstats.heap_max;

  if (double_free) {
    fprintf(stderr,
            "MEMORY BUG: %s:%d: invalid free of pointer %p, double free\n",
            file, line, ptr);
  } else if (in_heap_but_not_allocated) {
    fprintf(stderr,
            "MEMORY BUG: %s:%d: invalid free of pointer %p, not allocated\n",
            file, line, ptr);

    // Find the allocation that ptr is in, and print the allocation info
    for (const auto &[allocated_ptr, data] : active_allocations) {
      if ((char *)ptr >= (char *)allocated_ptr &&
          (char *)ptr < (char *)allocated_ptr + data.size) {
        fprintf(stderr,
                "  %s:%d: %p is %ld bytes inside a %zu byte region allocated "
                "here\n",
                data.file, data.line, ptr, (char *)ptr - (char *)allocated_ptr,
                data.size);
        return;
      }
    }
  } else {
    fprintf(stderr,
            "MEMORY BUG: %s:%d: invalid free of pointer %p, not in heap\n",
            file, line, ptr);
  }
}

// coalesce_previous(current)
//    Coalesces current freed allocation with the previous if they are
//    adjacent, erasing the current allocation & adding the size to the previous
void coalesce_previous(FreedAllocation::iterator current) {
  auto prev = std::prev(current);
  if ((char *)prev->first + prev->second == (char *)current->first) {
    prev->second += current->second;
    freed_allocations.erase(current);
  }
}

// coalesce_next(current)
//    Coalesces current freed allocation with the next one if they are
//    adjacent, erasing the next allocation & adding the size to the current
void coalesce_next(FreedAllocation::iterator current) {
  auto next = std::next(current);
  if (next != freed_allocations.end()) {
    if ((char *)current->first + current->second == (char *)next->first) {
      current->second += next->second;
      freed_allocations.erase(next);
    }
  }
}

/// m61_free(ptr, file, line)
///    Frees the memory allocation pointed to by `ptr`. If `ptr == nullptr`,
///    does nothing. Otherwise, `ptr` must point to a currently active
///    allocation returned by `m61_malloc`. The free was called at location
///    `file`:`line`.
void m61_free(void *ptr, const char *file, int line) {
  if (ptr == nullptr) {
    return;
  }

  // If the pointer is not in active allocations,log an error and abort
  auto active_it = active_allocations.find(ptr);
  if (active_it == active_allocations.end()) {
    log_invalid_free(ptr, file, line);
    abort();
  }

  // Check if the canary is valid
  if (memcmp((char *)ptr + active_it->second.size, CANARY, CANARY_SZ) != 0) {
    fprintf(stderr,
            "MEMORY BUG: %s:%d: detected wild write during free of "
            "pointer %p\n",
            file, line, ptr);
    abort();
  }

  // Update counting and size stats
  size_t freed_size = active_it->second.size;
  gstats.nactive--;
  gstats.active_size -= freed_size;

  if (active_it->second.size >= DEFAULT_ALLOC_BUFFER_SIZE) {
    for (auto it = buffers.begin(); it != buffers.end(); ++it) {
      if ((*it)->buffer == ptr) {
        delete *it;
        buffers.erase(it);
        return;
      }
    }
  }

  // Transfer the pointer to freed allocations
  active_allocations.erase(active_it);
  freed_size = align_size(freed_size + CANARY_SZ);
  freed_allocations[ptr] = freed_size;

  // Update last freed pointer to catch immediate double frees after coalescing
  last_freed_ptr = ptr;

  // Coalesce with adjacent freed allocations
  auto current = freed_allocations.find(ptr);
  if (current != freed_allocations.end()) {
    coalesce_next(current);
  }

  if (current != freed_allocations.begin()) {
    coalesce_previous(current);
  }
}

/// m61_calloc(count, sz, file, line)
///    Returns a pointer a fresh dynamic memory allocation big enough to
///    hold an array of `count` elements of `sz` bytes each. Returned
///    memory is initialized to zero. The allocation request was at
///    location `file`:`line`. Returns `nullptr` if out of memory; may
///    also return `nullptr` if `count == 0` or `size == 0`.
void *m61_calloc(size_t count, size_t sz, const char *file, int line) {
  // Check for integer overflow (first condition prevents division by 0)
  if (sz != 0 && count > SIZE_MAX / align_size(sz + CANARY_SZ)) {
    gstats.nfail++;
    gstats.fail_size += (count * sz);
    return nullptr;
  }

  void *ptr = m61_malloc(count * sz, file, line);

  if (ptr) {
    memset(ptr, 0, count * sz);
  }
  return ptr;
}

/// m61_realloc(ptr, sz, file, line)
///    Changes the size of the dynamic allocation pointed to by `ptr`
///    to hold at least `sz` bytes. If the existing allocation cannot be
///    enlarged, this function makes a new allocation, copies as much data
///    as possible from the old allocation to the new, and returns a pointer
///    to the new allocation. If `ptr` is `nullptr`, behaves like
///    `m61_malloc(sz, file, line). `sz` must not be 0. If a required
///    allocation fails, returns `nullptr` without freeing the original
///    block.
void *m61_realloc(void *ptr, size_t sz, const char *file, int line) {
  assert(sz != 0);
  if (ptr == nullptr) {
    return m61_malloc(sz, file, line);
  }

  // If the pointer is not in active allocations, log an error and abort
  auto it = active_allocations.find(ptr);
  if (it == active_allocations.end()) {
    log_invalid_free(ptr, file, line);
    abort();
  }

  // If the old size is the same as the new size, return the pointer
  if (it->second.size == sz) {
    return ptr;
  }

  // Calculate the size of the old allocation and the size of the new allocation
  size_t old_size_aligned = align_size(it->second.size + CANARY_SZ);
  size_t new_size_aligned = align_size(sz + CANARY_SZ);
  ssize_t diff = (ssize_t)it->second.size - (ssize_t)sz;

  // If the old size is bigger than the new size, shrink the size
  if (old_size_aligned >= new_size_aligned) {
    // Move canary to the new location, and update the size
    memcpy((char *)ptr + sz, CANARY, CANARY_SZ);
    it->second.size = sz;

    // Free the extra space after the canary
    if (diff > 0) {
      freed_allocations[(char *)ptr + new_size_aligned] =
          old_size_aligned - new_size_aligned;
      coalesce_next(freed_allocations.find((char *)ptr + new_size_aligned));
      gstats.ntotal++;
    }

    // Update the statistics
    gstats.active_size -= diff;

    return ptr;
  }

  // Check if there is a free block of memory immediately after the current that
  // is large enough to enlarge the current allocation
  char *next_ptr = (char *)ptr + old_size_aligned;
  auto next_freed = freed_allocations.find(next_ptr);

  if (next_freed != freed_allocations.end()) {
    // Remove the freed block from freed_allocations
    size_t available_size = next_freed->second;

    // If the available space is enough to enlarge the current allocation,
    // remove the freed block from freed_allocations
    if (old_size_aligned + available_size >= new_size_aligned) {
      freed_allocations.erase(next_freed);

      // If there's significant extra space, split it
      if (old_size_aligned + available_size > new_size_aligned + ALIGNMENT) {
        char *split_ptr = (char *)ptr + new_size_aligned;
        freed_allocations[split_ptr] =
            old_size_aligned + available_size - new_size_aligned;
      }

      // Update the allocation metadata
      active_allocations[ptr] = {sz, file, line};

      // Update canary
      memcpy((char *)ptr + sz, CANARY, CANARY_SZ);

      // Update the statistics
      gstats.active_size -= diff;
      gstats.total_size -= diff;

      return ptr;
    }
  }

  // Otherwise, we need to make a new allocation
  void *new_ptr = m61_malloc(sz, file, line);

  // If we still don't have a new ptr, return nullptr
  if (new_ptr == nullptr) {
    return nullptr;
  }

  // Copy the data from the old allocation to the new one
  memcpy(new_ptr, ptr, it->second.size);

  // Free the old allocation
  m61_free(ptr, file, line);

  return new_ptr;
}

/// m61_get_statistics()
///    Return the current memory statistics.
m61_statistics m61_get_statistics() { return gstats; }

/// m61_print_statistics()
///    Prints the current memory statistics.
void m61_print_statistics() {
  m61_statistics stats = m61_get_statistics();
  printf("alloc count: active %10llu   total %10llu   fail %10llu\n",
         stats.nactive, stats.ntotal, stats.nfail);
  printf("alloc size:  active %10llu   total %10llu   fail %10llu\n",
         stats.active_size, stats.total_size, stats.fail_size);
}

/// m61_print_leak_report()
///    Prints a report of all currently-active allocated blocks of dynamic
///    memory.
void m61_print_leak_report() {
  for (const auto &[ptr, info] : active_allocations) {
    printf("LEAK CHECK: %s:%d: allocated object %p with size %zu\n", info.file,
           info.line, ptr, info.size);
  }
}
