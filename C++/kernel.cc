#include "kernel.hh"
#include "k-apic.hh"
#include "k-vmiter.hh"
#include "obj/k-firstprocess.h"
#include <atomic>

// kernel.cc
//
//    This is the kernel.

// INITIAL PHYSICAL MEMORY LAYOUT
//
//  +-------------- Base Memory --------------+
//  v                                         v
// +-----+--------------------+----------------+--------------------+---------/
// |     | Kernel      Kernel |       :    I/O | App 1        App 1 | App 2
// |     | Code + Data  Stack |  ...  : Memory | Code + Data  Stack | Code ...
// +-----+--------------------+----------------+--------------------+---------/
// 0  0x40000              0x80000 0xA0000 0x100000             0x140000
//                                             ^
//                                             | \___ PROC_SIZE ___/
//                                      PROC_START_ADDR

#define PROC_SIZE 0x40000 // initial state only

proc ptable[PID_MAX]; // array of process descriptors
                      // Note that `ptable[0]` is never used.
proc *current;        // pointer to currently executing proc

#define HZ 100                           // timer interrupt frequency (interrupts/sec)
static std::atomic<unsigned long> ticks; // # timer interrupts so far

// Memory state - see `kernel.hh`
physpageinfo physpages[NPAGES];

[[noreturn]] void schedule();
[[noreturn]] void run(proc *p);
void exception(regstate *regs);
uintptr_t syscall(regstate *regs);
void memshow();

int all_perms = PTE_P | PTE_U | PTE_W; // All relevant permissions for a
                                       // page for this PSET. Made global so
                                       // it can be used in multiple
                                       // functions, and so it can be
                                       // modified if needed.

// kernel_start(command)
//    Initialize the hardware and processes and start running. The `command`
//    string is an optional string passed from the boot loader.

static void process_setup(pid_t pid, const char *program_name);

void kernel_start(const char *command)
{
  // initialize hardware
  init_hardware();
  log_printf("Starting WeensyOS\n");

  ticks = 1;
  init_timer(HZ);

  // clear screen
  console_clear();

  // (re-)initialize kernel page table
  for (uintptr_t addr = 0; addr < MEMSIZE_PHYSICAL; addr += PAGESIZE)
  {
    int kernel_perms = all_perms;
    if (addr == 0)
    {
      // nullptr is inaccessible even to the kernel
      kernel_perms = 0;
    }
    else if (addr < PROC_START_ADDR && addr != CONSOLE_ADDR)
    {
      // Kernel space is not user-accessible, except for the console
      kernel_perms &= ~PTE_U;
    }
    // install identity mapping
    int r = vmiter(kernel_pagetable, addr).try_map(addr, kernel_perms);
    assert(r == 0); // mappings during kernel_start MUST NOT fail
                    // (Note that later mappings might fail!!)
  }

  // set up process descriptors
  for (pid_t i = 0; i < PID_MAX; i++)
  {
    ptable[i].pid = i;
    ptable[i].state = P_FREE;
  }
  if (!command)
  {
    command = WEENSYOS_FIRST_PROCESS;
  }
  if (!program_image(command).empty())
  {
    process_setup(1, command);
  }
  else
  {
    process_setup(1, "allocator");
    process_setup(2, "allocator2");
    process_setup(3, "allocator3");
    process_setup(4, "allocator4");
  }

  // switch to first process using run()
  run(&ptable[1]);
}

// kalloc(sz)
//    Kernel physical memory allocator. Allocates at least `sz` contiguous
//    bytes and returns a pointer to the allocated memory, or `nullptr` on
//    failure. The returned pointer’s address is a valid physical address, but
//    since the WeensyOS kernel uses an identity mapping for virtual memory, it
//    is also a valid virtual address that the kernel can access or modify.
//
//    The allocator selects from physical pages that can be allocated for
//    process use (so not reserved pages or kernel data), and from physical
//    pages that are currently unused (`physpages[N].refcount == 0`).
//
//    On WeensyOS, `kalloc` is a page-based allocator: if `sz > PAGESIZE`
//    the allocation fails; if `sz < PAGESIZE` it allocates a whole page
//    anyway.
//
//    The returned memory is initially filled with 0xCC, which corresponds to
//    the `int3` instruction. Executing that instruction will cause a `PANIC:
//    Unhandled exception 3!` This may help you debug.

void *kalloc(size_t sz)
{
  // WeensyOS only allocates single pages, so if sz > PAGESIZE, return nullptr
  if (sz > PAGESIZE)
  {
    return nullptr;
  }

  // Initialize page number and page increment. A page_increment of 1,
  // is used, which means the allocator will allocate pages sequentially.
  int pageno = 0;
  int page_increment = 1;

  // Loop through all pages to find a free page, if found, allocate it and
  // return the pointer. Memset the page to 0xCC for debugging, since 0xCC
  // is the int3 instruction which will cause a panic if it is executed
  for (int tries = 0; tries != NPAGES; ++tries)
  {
    uintptr_t pa = pageno * PAGESIZE;
    if (allocatable_physical_address(pa) && physpages[pageno].refcount == 0)
    {
      ++physpages[pageno].refcount;
      memset((void *)pa, 0xCC, PAGESIZE);
      return (void *)pa;
    }
    pageno = (pageno + page_increment) % NPAGES;
  }

  // If no free page is found, return nullptr
  return nullptr;
}

// kfree(kptr)
//    Free `kptr`, which must have been previously returned by `kalloc`.
//    If `kptr == nullptr` does nothing.

void kfree(void *kptr)
{
  if (kptr == nullptr)
  {
    return;
  }

  // Get the physical address of the page that kptr
  // points to, and the corresponding page number.
  uintptr_t pa = kptr2pa(kptr);
  auto page_number = pa / PAGESIZE;

  // Panic if the page is not allocatable -- this should never happen.
  if (!allocatable_physical_address(pa))
  {
    panic("kfree: page %p is not allocatable\n", kptr);
  }

  // Check if the page number is within bounds, to avoid out of bounds
  // access errors when accessing the physpages array.
  if (page_number >= NPAGES)
  {
    panic("kfree: page number %zu is out of bounds\n", page_number);
  }

  // Check if the page is currently allocated to avoid
  // wild pointer dereferences or double frees.
  if (physpages[page_number].refcount <= 0)
  {
    panic("kfree: page %d is not allocated\n", page_number);
  }

  // Decrement the reference count
  --physpages[page_number].refcount;

  // Zero out the memory to prevent use-after-free bugs
  if (physpages[page_number].refcount == 0)
  {
    memset((void *)pa, 0, PAGESIZE);
  }
}

// process_setup(pid, program_name)
//    Load application program `program_name` as process number `pid`.
//    This loads the application's code and data into memory, sets its
//    %rip and %rsp, gives it a stack page, and marks it as runnable.

void process_setup(pid_t pid, const char *program_name)
{
  init_process(&ptable[pid], 0);
  ptable[pid].wake_ticks = 0;

  // Initialize process page table with a blank page table
  ptable[pid].pagetable = kalloc_pagetable();

  // Copy over the relevant kernel mappings
  for (vmiter k_it(kernel_pagetable, 0); k_it.va() < PROC_START_ADDR;
       k_it += PAGESIZE)
  {
    if (k_it.present())
    {
      int r = vmiter(ptable[pid].pagetable, k_it.va())
                  .try_map(k_it.pa(), k_it.perm());
      assert(r == 0); // Try_map calls in process_setup should succeed
    }
  }

  // Obtain reference to program image
  // (The program image models the process executable.)
  program_image pgm(program_name);

  // Loop through each segment in the program image
  for (auto seg = pgm.begin(); seg != pgm.end(); ++seg)
  {
    // Set segment permissions based on writability
    int seg_perm = seg.writable() ? all_perms : (all_perms & ~PTE_W);

    // Loop through the segment by page size, allocating a page for
    // each iteration, copying the segment data into the page, and
    // mapping the page to the process's page table
    for (uintptr_t a = round_down(seg.va(), PAGESIZE);
         a < seg.va() + seg.size(); a += PAGESIZE)
    {
      // Allocate a page for the segment.
      // If out of memory, return as to not panic the kernel
      void *page = kalloc(PAGESIZE);
      if (page == nullptr)
      {
        return;
      }

      // Calculate the offset within the segment for this page.
      // Max is used to handle the case where the segment starts
      // before the page or starts at the same address as the page
      uintptr_t page_offset = max(seg.va(), a) - seg.va();

      // Determine how much data to copy into this page by taking the min
      // of the page size and the size of the remaining segment data
      size_t copy_size =
          min(PAGESIZE, seg.va() + seg.data_size() - max(seg.va(), a));

      // Copy the segment data into the page, starting from the
      // calculated offset and copying the calculated size
      memcpy(page, seg.data() + page_offset, copy_size);

      // Zero the rest of the page if necessary. This occurs when
      // the segment does not completely fill the space of the page
      if (copy_size < PAGESIZE)
      {
        memset((char *)page + copy_size, 0, PAGESIZE - copy_size);
      }

      // Map the newly allocated page to the process's page
      // table with the segment's permissions (all permissions
      // if writable, otherwise only user-accessible and present)
      int r = vmiter(ptable[pid].pagetable, a).try_map(page, seg_perm);
      assert(r == 0); // Try_map calls in process_setup should succeed
    }
  }

  // Mark entry point
  ptable[pid].regs.reg_rip = pgm.entry();

  // Allocate a new page beginning at the stack address. If
  // no stack page is found, return as to not panic the kernel
  uintptr_t stack_addr = MEMSIZE_VIRTUAL - PAGESIZE;
  void *stack_page = kalloc(PAGESIZE);
  if (stack_page == nullptr)
  {
    return;
  }
  memset(stack_page, 0, PAGESIZE); // Zero out the stack page

  // Map the stack page to the process's page table
  int r =
      vmiter(ptable[pid].pagetable, stack_addr).try_map(stack_page, all_perms);
  assert(r == 0); // All calls to try_map in process_setup should succeed

  ptable[pid].regs.reg_rsp = stack_addr + PAGESIZE; // Set the rsp to the
                                                    // top of the stack
  ptable[pid].state = P_RUNNABLE;                   // Mark the process as runnable
}

// exception(regs)
//    Exception handler (for interrupts, traps, and faults).
//
//    The register values from exception time are stored in `regs`.
//    The processor responds to an exception by saving application state on
//    the kernel's stack, then jumping to kernel assembly code (in
//    k-exception.S). That code saves more registers on the kernel's stack,
//    then calls exception().
//
//    Note that hardware interrupts are disabled when the kernel is running.

void exception(regstate *regs)
{
  // Copy the saved registers into the `current` process descriptor.
  current->regs = *regs;
  regs = &current->regs;

  // It can be useful to log events using `log_printf`.
  // Events logged this way are stored in the host's `log.txt` file.
  /* log_printf("proc %d: exception %d at rip %p\n",
              current->pid, regs->reg_intno, regs->reg_rip); */

  // Show the current cursor location and memory state
  // (unless this is a kernel fault).
  console_show_cursor(cursorpos);
  if (regs->reg_intno != INT_PF || (regs->reg_errcode & PTE_U))
  {
    memshow();
  }

  // If Control-C was typed, exit the virtual machine.
  check_keyboard();

  // Actually handle the exception.
  switch (regs->reg_intno)
  {
  case INT_IRQ + IRQ_TIMER:
    ++ticks;
    lapicstate::get().ack();
    schedule();
    break; /* will not be reached */

  case INT_PF:
  {
    // Analyze faulting address and access type.
    uintptr_t addr = rdcr2();
    const char *operation = regs->reg_errcode & PTE_W ? "write" : "read";
    const char *problem = regs->reg_errcode & PTE_P ? "protection "
                                                      "problem"
                                                    : "missing page";

    // Handle copy-on-write fault
    if ((regs->reg_errcode & PTE_P) && (regs->reg_errcode & PTE_W) &&
        regs->reg_errcode & PTE_U)
    {
      vmiter it(current->pagetable, round_down(addr, PAGESIZE));

      // If the page is referenced by more than one process, create a copy
      if (physpages[it.pa() / PAGESIZE].refcount > 1)
      {
        void *new_page = kalloc(PAGESIZE);
        if (new_page)
        {
          memcpy(new_page, (void *)it.pa(), PAGESIZE);

          // Decrement the reference count of the original page
          --physpages[it.pa() / PAGESIZE].refcount;

          // Map the new page as writeable
          int r = it.try_map(new_page, all_perms);
          if (r == 0)
          {
            // Mapping was successful, so break out of the loop
            break;
          }
          kfree(new_page);
        }
      }
      else
      {
        // Only this process references the page; restore write permissions
        int r = it.try_map(it.pa(), it.perm() | PTE_W);
        if (r == 0)
        {
          break; // Exit exception handler to resume execution
        }
      }
    }

    if (!(regs->reg_errcode & PTE_U))
    {
      proc_panic(current, "Kernel page fault on %p (%s %s, rip=%p)!\n", addr,
                 operation, problem, regs->reg_rip);
    }
    error_printf(CPOS(24, 0), COLOR_ERROR,
                 "PAGE FAULT on %p (pid %d, %s %s, rip=%p)!\n", addr,
                 current->pid, operation, problem, regs->reg_rip);
    log_print_backtrace(current);
    current->state = P_FAULTED;
    break;
  }

  default:
    proc_panic(current, "Unhandled exception %d (rip=%p)!\n", regs->reg_intno,
               regs->reg_rip);
  }

  // Return to the current process (or run something else).
  if (current->state == P_RUNNABLE)
  {
    run(current);
  }
  else
  {
    schedule();
  }
}

int syscall_page_alloc(uintptr_t addr, size_t sz);
int syscall_fork();
int syscall_sleep(unsigned long ticks_to_sleep);
void exit_process(proc *process);
int syscall_page_free(uintptr_t addr);
int syscall_kill(pid_t pid);

// syscall(regs)
//    Handle a system call initiated by a `syscall` instruction.
//    The process’s register values at system call time are accessible in
//    `regs`.
//
//    If this function returns with value `V`, then the user process will
//    resume with `V` stored in `%rax` (so the system call effectively
//    returns `V`). Alternately, the kernel can exit this function by
//    calling `schedule()`, perhaps after storing the eventual system call
//    return value in `current->regs.reg_rax`.
//
//    It is only valid to return from this function if
//    `current->state == P_RUNNABLE`.
//
//    Note that hardware interrupts are disabled when the kernel is running.

uintptr_t syscall(regstate *regs)
{
  // Copy the saved registers into the `current` process descriptor.
  current->regs = *regs;
  regs = &current->regs;

  // It can be useful to log events using `log_printf`.
  // Events logged this way are stored in the host's `log.txt` file.
  /* log_printf("proc %d: syscall %d at rip %p\n",
                current->pid, regs->reg_rax, regs->reg_rip); */

  // Show the current cursor location and memory state.
  console_show_cursor(cursorpos);
  memshow();

  // If Control-C was typed, exit the virtual machine.
  check_keyboard();

  // Actually handle the exception.
  switch (regs->reg_rax)
  {
  case SYSCALL_PANIC:
    user_panic(current);
    break; // will not be reached
  case SYSCALL_GETPID:
    return current->pid;
  case SYSCALL_YIELD:
    current->regs.reg_rax = 0;
    schedule(); // does not return
  case SYSCALL_PAGE_ALLOC:
    return syscall_page_alloc(current->regs.reg_rdi, current->regs.reg_rsi);
  case SYSCALL_FORK:
    return syscall_fork();
  case SYSCALL_EXIT:
    exit_process(current);
    schedule(); // does not return
  case SYSCALL_PAGE_FREE:
    return syscall_page_free(current->regs.reg_rdi);
  case SYSCALL_KILL:
    return syscall_kill(current->regs.reg_rdi);
  case SYSCALL_SLEEP:
    return syscall_sleep(current->regs.reg_rdi);
  default:
    proc_panic(current, "Unhandled system call %ld (pid=%d, rip=%p)!\n",
               regs->reg_rax, current->pid, regs->reg_rip);
  }

  panic("Should not get here!\n");
}

// cleanup_page_alloc(addr, va)
//    Frees all the pages in the current process's page table that are user-
//    accessible and not the console, starting from the given address up to
//    (but not including) the given virtual address.

void cleanup_page_alloc(uintptr_t addr, uintptr_t va)
{
  for (uintptr_t free_va = addr; free_va < va; free_va += PAGESIZE)
  {
    vmiter free_it(current->pagetable, free_va);
    if (free_it.present() && free_it.user() && free_it.va() != CONSOLE_ADDR)
    {
      kfree(free_it.kptr());
      int r = free_it.try_map((uintptr_t)-1, 0);
      // try_map to -1 should never fail
      assert(r == 0);
    }
  }
}

// find_free_chunk(sz)
//    Finds the first contiguous free chunk of memory of the requested size or
//    greater, starting from the beginning of non-kernel address space. Returns
//    the address of the first page in the chunk on success, or 0 on failure.
uintptr_t find_free_chunk(size_t sz)
{
  uintptr_t addr = 0; // Start with the default addr of 0
  vmiter it(current->pagetable, PROC_START_ADDR);
  while (it.va() < MEMSIZE_VIRTUAL)
  {
    if (!it.present())
    {
      // If the page is not present (indicating it is free), loop through the
      // following pages until either the appropriate amount of free memory is
      // found, or the end of the address space is reached
      uintptr_t start = it.va();
      size_t free_size = 0;
      while (it.va() < MEMSIZE_VIRTUAL && !it.present() && free_size < sz)
      {
        free_size += PAGESIZE;
        it += PAGESIZE;
      }

      // If the free memory is at least the size requested, allocate & break
      if (free_size >= sz)
      {
        addr = start;
        break;
      }

      // Otherwise, move beyond this chunk of free memory, since the
      // next n pages in this chunk will only be smaller in contiguous size
      // than the first page in this chunk
      it += free_size;
    }
    else
    {
      // If this page is present, move to the next page
      it += PAGESIZE;
    }
  }
  return addr;
}

// syscall_page_alloc(addr)
//    Handles the SYSCALL_PAGE_ALLOC system call. Allocates a page at the
//    given address if possible, returning the address on success or -1 on
//    failure. Addresses that are not valid (aligned, within bounds,
//    and in user space), or are already allocated, causes failure.

int syscall_page_alloc(uintptr_t addr, size_t sz = PAGESIZE)
{
  // If addr is 0, try to allocate memory at the first point in which a
  // contiguous free chunk of the requested size or greater is available
  addr = addr == 0 ? find_free_chunk(sz) : addr;

  // If no contiguous free chunk is found, return -1
  if (addr == 0)
  {
    return -1;
  }

  // Check if the address (either user-supplied or determined above) is valid
  // (aligned, within bounds, and in user space, and not already allocated)
  // clang-format off
    if (addr <  PROC_START_ADDR  || 
        addr >= MEMSIZE_VIRTUAL  || 
        addr %  PAGESIZE != 0    ||
        vmiter(current->pagetable, addr).present()) {
        return -1;
    } // clang-format on

  // Allocate a page for each page in the requested chunk
  for (uintptr_t va = addr; va < addr + sz; va += PAGESIZE)
  {
    // If attempting to overwrite a page that already is allocated, return -1
    if (vmiter(current->pagetable, va).present())
    {
      return -1;
    }

    // Allocate a page
    void *page = kalloc(PAGESIZE);
    if (!page)
    {
      // If allocation fails, it is no longer enough to just return -1, since
      // we may be allocating multiple pages. We must free all the pages we have
      // allocated so far.
      cleanup_page_alloc(addr, va);
      return -1;
    }

    // Map the page's physical address to the process's page
    // table at the given address with the all permissions
    int r = vmiter(current->pagetable, va).try_map(page, all_perms);
    if (r != 0)
    {
      // If mapping fails, free the page and free all the pages we have
      // allocated, and remove them from the page table mapping
      kfree(page);
      cleanup_page_alloc(addr, va);
      return -1;
    }

    // Initialize the memory in the page to 0
    memset(page, 0, PAGESIZE);
  }
  return addr;
}

// exit_process(process)
//    Frees all the pages in the process's page table that are user-accessible
//    and not the console, then frees all the entries in the page table itself.
//    Finally, it marks the process as free.

void exit_process(proc *process)
{
  // Get the process's page table
  x86_64_pagetable *pagetable = process->pagetable;

  // Free all the pages in the page table that are user-accessible and not the
  // console
  for (vmiter it(pagetable, 0); it.va() < MEMSIZE_VIRTUAL; it += PAGESIZE)
  {
    if (it.present() && it.user() && it.va() != CONSOLE_ADDR)
    {
      kfree(it.kptr());
    }
  }

  // Free all entries in the page table
  for (ptiter it(pagetable); !it.done(); it.next())
  {
    kfree(it.kptr());
  }

  // Free the page table itself
  kfree(pagetable);
  pagetable = nullptr;

  process->state = P_FREE; // Mark the process as free
}

// syscall_fork()
//    Handles the SYSCALL_FORK system call. On success, it creates a new process
//    that is an exact copy of the calling process, except for its process ID
//    and return value. The new process (child) gets a return value of 0, while
//    the parent process gets the child's process ID as the return value. On
//    failure (e.g., out of memory or no free process slots), it returns a
//    negative error code to the caller without creating a new process.
//    Returns the child's process ID on success, or -1 on failure.

int syscall_fork()
{
  // Loop through the process table to find a free slot
  int free_slot = -1;
  for (int i = 1; i < PID_MAX; i++)
  {
    if (ptable[i].state == P_FREE)
    {
      free_slot = i;
      break;
    }
  }
  if (free_slot == -1)
  { // Out of process slots
    return -1;
  }

  // Allocate a new page table
  x86_64_pagetable *child_pagetable = kalloc_pagetable();
  if (child_pagetable == nullptr)
  {
    return -1;
  }

  // Copy the parent's registers, except for reg_rax
  ptable[free_slot].regs = current->regs;
  ptable[free_slot].regs.reg_rax = 0;

  // Update the data in the process table for the child process
  ptable[free_slot].state = P_RUNNABLE;
  ptable[free_slot].pagetable = child_pagetable;
  ptable[free_slot].pid = free_slot;

  // Copy kernel mappings from kernel_pagetable to child_pagetable
  for (vmiter k_it(kernel_pagetable, 0); k_it.va() < PROC_START_ADDR;
       k_it += PAGESIZE)
  {
    if (k_it.present())
    {
      int r =
          vmiter(child_pagetable, k_it.va()).try_map(k_it.pa(), k_it.perm());
      if (r != 0)
      {
        exit_process(
            &ptable[free_slot]); // If mapping fails, exit the child process
        return -1;
      }
    }
  }

  // Copy the parent's user-space page table to the child
  // clang-format off
    for (vmiter parent_it(current->pagetable, PROC_START_ADDR); 
                parent_it.va() < MEMSIZE_VIRTUAL;
                parent_it += PAGESIZE) { // clang-format on

    // First, check foremost if the page is present. If not, skip it
    if (!parent_it.present())
    {
      continue;
    }

    // If the page is user-accessible and not the console, and is writable,
    // allocate a new page for the child. Otherwise, share the same physical
    // page in the child's page table. (This is the case for read-only pages.)
    if (parent_it.user() && parent_it.va() != CONSOLE_ADDR)
    {
      int new_perm = parent_it.perm() & ~PTE_W;

      // Map in child page table at the same virtual address
      int r = vmiter(child_pagetable, parent_it.va())
                  .try_map(parent_it.pa(), new_perm);
      if (r != 0)
      {
        // If mapping fails, exit the child process
        exit_process(&ptable[free_slot]);
        return -1;
      }

      // Remove the write permission from the parent page
      r = parent_it.try_map(parent_it.pa(), new_perm);

      if (r != 0)
      {
        // If mapping fails, exit the child process, since COW cannot be
        // executed correctly if the parent's write permission is not removed
        exit_process(&ptable[free_slot]);
        return -1;
      }

      // Increment the refcount of the physical page,
      // since the child process now shares the same page
      ++physpages[parent_it.pa() / PAGESIZE].refcount;
    }
    else
    {
      // Map the same physical page in the child's page table at the same
      // virtual address
      int r = vmiter(child_pagetable, parent_it.va())
                  .try_map(parent_it.pa(), parent_it.perm());
      if (r != 0)
      {
        exit_process(
            &ptable[free_slot]); // If mapping fails, exit the child process
        return -1;
      }

      // Increment the refcount of the physical page,
      // since the child process now shares the same page
      ++physpages[parent_it.pa() / PAGESIZE].refcount;
    }
  }

  return free_slot; // Return the child's process ID
}

// schedule
//    Pick the next process to run and then run it.
//    If there are no runnable processes, spins forever.
void schedule()
{
  // First, check all processes to wake up any that are ready
  for (pid_t p = 0; p < PID_MAX; ++p)
  {
    if (ptable[p].state == P_SLEEPING && ticks >= ptable[p].wake_ticks)
    {
      ptable[p].state = P_RUNNABLE;
    }
  }

  pid_t pid = current->pid;
  for (unsigned spins = 1; true; ++spins)
  {
    pid = (pid + 1) % PID_MAX;

    if (ptable[pid].state == P_RUNNABLE)
    {
      run(&ptable[pid]);
    }

    // If Control-C was typed, exit the virtual machine.
    check_keyboard();

    // If spinning forever, show the memviewer.
    if (spins % (1 << 12) == 0)
    {
      memshow();
    }
  }
}

// run(p)
//    Run process `p`. This involves setting `current = p` and calling
//    `exception_return` to restore its page table and registers.

void run(proc *p)
{
  assert(p->state == P_RUNNABLE);
  current = p;

  // Check the process's current registers.
  check_process_registers(p);

  // Check the process's current pagetable.
  check_pagetable(p->pagetable);

  // This function is defined in k-exception.S. It restores the process's
  // registers then jumps back to user mode.
  exception_return(p);

  // should never get here
  while (true)
  {
  }
}

// memshow()
//    Draw a picture of memory (physical and virtual) on the CGA console.
//    Switches to a new process's virtual memory map every 0.25 sec.
//    Uses `console_memviewer()`, a function defined in `k-memviewer.cc`.

void memshow()
{
  static unsigned last_ticks = 0;
  static int showing = 0;

  // switch to a new process every 0.25 sec
  if (last_ticks == 0 || ticks - last_ticks >= HZ / 2)
  {
    last_ticks = ticks;
    showing = (showing + 1) % PID_MAX;
  }

  proc *p = nullptr;
  for (int search = 0; !p && search < PID_MAX; ++search)
  {
    if (ptable[showing].state != P_FREE && ptable[showing].pagetable)
    {
      p = &ptable[showing];
    }
    else
    {
      showing = (showing + 1) % PID_MAX;
    }
  }

  console_memviewer(p);
  if (!p)
  {
    console_printf(CPOS(10, 26), 0x0F00,
                   "   VIRTUAL ADDRESS SPACE\n"
                   "                          [All processes have exited]\n"
                   "\n\n\n\n\n\n\n\n\n\n\n");
  }
}

// syscall_page_free(addr)
//    Handles the SYSCALL_PAGE_FREE system call. Frees a page at the
//    given address if possible, returning 0 on success or -1 on failure.
//    Addresses that are not valid (aligned, within bounds,
//    and in user space), or are already free, causes failure.

int syscall_page_free(uintptr_t addr)
{
  // Validate the address (must be page-aligned, in user space, and present)
  if (addr < PROC_START_ADDR || addr >= MEMSIZE_VIRTUAL ||
      addr % PAGESIZE != 0)
  {
    return -1;
  }

  // Get iterator for the page
  vmiter it(current->pagetable, addr);

  // Can't free kernel pages or the console, or unmapped pages
  if (!it.present() || !it.user() || addr == CONSOLE_ADDR)
  {
    return -1;
  }

  // Free the physical page
  kfree(it.kptr());

  // Unmap the page from the page table
  int r = it.try_map((uintptr_t)-1, 0);
  if (r != 0)
  {
    return -1;
  }

  return 0;
}

// syscall_kill(pid)
//    Handles the SYSCALL_KILL system call. Kills the process with the given
//    PID. Returns 0 on success or -1 on failure.

int syscall_kill(pid_t pid)
{
  // Check if the PID is valid
  // PID must be greater than 0, less than PID_MAX, not free, and not the
  // current process
  if (pid <= 0 || pid >= PID_MAX || ptable[pid].state == P_FREE ||
      pid == current->pid)
  {
    return -1;
  }
  // Mark the process as free and exit it
  ptable[pid].state = P_FREE;
  exit_process(&ptable[pid]);
  return 0;
}

// syscall_sleep(ticks)
//    Puts the current process to sleep for at least the specified number of ticks.
//    Returns 0 when the sleep completes.
int syscall_sleep(unsigned long ticks_to_sleep)
{
  if (ticks_to_sleep == 0)
  {
    return 0;
  }
  current->wake_ticks = ticks + ticks_to_sleep;
  current->state = P_SLEEPING;
  schedule();
  return 0;
}