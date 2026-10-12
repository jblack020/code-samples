#include "sh61.hh"
#include <cerrno>
#include <cstring>
#include <sys/stat.h>
#include <sys/wait.h>
#include <vector>

// For the love of God
#undef exit
#define exit __DO_NOT_CALL_EXIT__READ_PROBLEM_SET_DESCRIPTION__

constexpr mode_t DEFAULT_FILE_MODE = 0666;

volatile sig_atomic_t interrupted = 0;
void handle_sigint(int) { interrupted = 1; }

// struct command
//    Data structure describing a command. Add your own stuff.

struct command {
  std::vector<std::string> args;
  pid_t pid = -1; // process ID running this command, -1 if none

  int input_pipe = -1;  // read end of the pipe
  int output_pipe = -1; // write end of the pipe
  int status = -1;      // status of the command

  std::string input_file;  // The input file for this command
  std::string output_file; // The output file for this command
  std::string error_file;  // The error file for this command

  std::string input_redirect_op;  // The redirection operator for this command
  std::string output_redirect_op; // The redirection operator for this command
  std::string error_redirect_op;  // The redirection operator for this command

  pid_t pgid = -1; // process group ID for this command

  command();
  ~command();

  void run();                 // Run the command
  void handle_redirections(); // Handle input and output redirections
  void handle_pipes();        // Handle input and output piping
  void handle_cd();           // Handle the cd command
};

// command::command()
//    This constructor function initializes a `command` structure. You may
//    add stuff to it as you grow the command structure.

command::command() {}

// command::~command()
//    This destructor function is called to delete a command.

command::~command() {}

// command::handle_redirections()
//    This function handles input and output redirections. If a command
//    has an input, output, or error file associated with it, this function
//    opens the file and redirects input/output/error to the file.

void command::handle_redirections() {
  // Set up input redirection if there's an input file
  if (!this->input_file.empty()) {
    int input_fd = open(this->input_file.c_str(), O_RDONLY);

    if (input_fd == -1) {
      perror(this->input_file.c_str());
      this->status = EXIT_FAILURE;
      _exit(EXIT_FAILURE);
    }

    dup2(input_fd, STDIN_FILENO);
    close(input_fd);
  }

  // Set up output redirection if there's an output file
  if (!this->output_file.empty()) {
    int output_fd = -1;
    if (this->output_redirect_op == ">") {
      output_fd = open(this->output_file.c_str(), O_WRONLY | O_CREAT | O_TRUNC,
                       DEFAULT_FILE_MODE);
    } else if (this->output_redirect_op == ">>") {
      output_fd = open(this->output_file.c_str(), O_WRONLY | O_CREAT | O_APPEND,
                       DEFAULT_FILE_MODE);
    } else if (this->output_redirect_op == "&>") {
      output_fd = open(this->output_file.c_str(), O_WRONLY | O_CREAT | O_APPEND,
                       DEFAULT_FILE_MODE);
      dup2(output_fd, STDERR_FILENO);
      dup2(output_fd, STDOUT_FILENO);
      close(output_fd);
      return; // Exit the function early, since we've already handled the
              // redirection of stderr
    }

    if (output_fd == -1) {
      perror(this->output_file.c_str());
      this->status = EXIT_FAILURE;
      _exit(EXIT_FAILURE);
    }

    dup2(output_fd, STDOUT_FILENO);
    close(output_fd);
  }

  // Set up error redirection if there's an error file
  if (!this->error_file.empty()) {
    int error_fd =
        open(this->error_file.c_str(), O_WRONLY | O_CREAT | O_TRUNC, 0666);

    if (error_fd == -1) {
      perror(this->error_file.c_str());
      this->status = EXIT_FAILURE;
      _exit(EXIT_FAILURE);
    }

    dup2(error_fd, STDERR_FILENO);
    close(error_fd);
  }
}

// command::handle_pipes()
//    This function handles input and output piping. If a command has an
//    input pipe or output pipe associated with it, this function opens the
//    pipe and redirects input/output to the pipe.

void command::handle_pipes() {
  // Redirect stdout to the output pipe if it is open
  if (this->output_pipe != -1) {
    dup2(this->output_pipe, STDOUT_FILENO);
    close(this->output_pipe);
  }

  // Redirect stdin to the input pipe if it is open
  if (this->input_pipe != -1) {
    dup2(this->input_pipe, STDIN_FILENO);
    close(this->input_pipe);
  }
}

// command::handle_cd()
//    This function handles the cd command. If the command's first argument
//    was "cd", this function changes the current working directory to the
//    directory specified in the command's second argument, or to the value
//    of the HOME environment variable by default.

void command::handle_cd() {
  // Initialize copies of the original file descriptors
  int stdin_copy = -1, stdout_copy = -1, stderr_copy = -1;

  // If there are any redirections, save and redirect
  if (!this->input_file.empty() || !this->output_file.empty() ||
      !this->error_file.empty()) {
    // Save original file descriptors
    stdin_copy = dup(STDIN_FILENO);
    stdout_copy = dup(STDOUT_FILENO);
    stderr_copy = dup(STDERR_FILENO);

    // If the dup failed, set the status to failure and return
    if (stdin_copy == -1 || stdout_copy == -1 || stderr_copy == -1) {
      perror("dup");
      this->status = EXIT_FAILURE;
      return;
    }
    // Apply I/O redirections
    this->handle_redirections();
  }

  // Default to HOME directory if no argument provided
  const char *dir = getenv("HOME");
  if (this->args.size() > 1) {
    dir = this->args[1].c_str();
  }

  // Change directory and check for errors
  if (chdir(dir) == -1) {
    perror(dir);
    this->status = EXIT_FAILURE;
  } else {
    this->status = EXIT_SUCCESS;
  }

  // Restore original file descriptors if they were modified
  if (stdin_copy != -1) {
    dup2(stdin_copy, STDIN_FILENO);
    close(stdin_copy);
  }
  if (stdout_copy != -1) {
    dup2(stdout_copy, STDOUT_FILENO);
    close(stdout_copy);
  }
  if (stderr_copy != -1) {
    dup2(stderr_copy, STDERR_FILENO);
    close(stderr_copy);
  }
}

// COMMAND EXECUTION

// command::run()
//    Creates a single child process running the command in `this`, and
//    sets `this->pid` to the pid of the child process.
//
//    If a child process cannot be created, this function should call
//    `_exit(EXIT_FAILURE)` (that is, `_exit(1)`) to exit the containing
//    shell or subshell. If this function returns to its caller,
//    `this->pid > 0` must always hold.
//
//    Note that this function must return to its caller *only* in the parent
//    process. The code that runs in the child process must `execvp` and/or
//    `_exit`.
//
//    PHASE 1: Fork a child process and run the command using `execvp`.
//       This will require creating a vector of `char*` arguments using
//       `this->args[N].c_str()`. Note that the last element of the vector
//       must be a `nullptr`.
//    PHASE 4: Set up a pipeline if appropriate. This may require creating a
//       new pipe (`pipe` system call), and/or replacing the child process's
//       standard input/output with parts of the pipe (`dup2` and `close`).
//       Draw pictures!
//    PHASE 7: Handle redirections.

void command::run() {
  assert(this->pid == -1);
  assert(this->args.size() > 0);

  // Handle cd command specially before creating any processes
  if (this->args[0] == "cd") {
    this->handle_cd();
    return;
  }

  // Create a vector of char* arguments ending with nullptr
  std::vector<const char *> argv;
  for (const auto &arg : this->args) {
    argv.push_back(arg.c_str());
  }
  argv.push_back(nullptr);

  // Fork child process
  pid_t child_pid = fork();

  // Fork failed, exit with failure
  if (child_pid == -1) {
    perror("fork");
    this->status = EXIT_FAILURE;
    _exit(EXIT_FAILURE);

    // Handle child process
  } else if (child_pid == 0) {
    // Child process
    setpgid(0, 0); // Create new process group

    this->handle_pipes();
    this->handle_redirections();

    execvp(argv[0], (char *const *)argv.data());
    perror(argv[0]);
    _exit(EXIT_FAILURE);

    // Parent process, close open pipes and set the pid
  } else {
    // Parent process
    setpgid(child_pid, child_pid); // Ensure child is in its own group

    // Close the input pipe if it is open
    if (this->input_pipe != -1) {
      close(this->input_pipe);
      this->input_pipe = -1;
    }

    // Close the output pipe if it is open
    if (this->output_pipe != -1) {
      close(this->output_pipe);
      this->output_pipe = -1;
    }
    this->pid = child_pid;
    this->pgid = child_pid; // Store process group ID
  }
}

// run_commands(std::vector<command *> commands)
//    Runs all commands in the vector in parallel. Returns the status of the
//    last command in the pipeline.

int run_commands(std::vector<command *> commands) {
  // Run all commands in the pipeline
  for (auto c : commands) {
    c->run();
  }

  int status = -1;
  command *last_cmd = commands.back();

  if (last_cmd->pid != -1) {
    // Give terminal control to command's process group
    claim_foreground(last_cmd->pgid);

    if (waitpid(last_cmd->pid, &status, 0) == -1) {
      perror("waitpid");
    }

    // Return terminal control to shell
    claim_foreground(0);
  } else {
    status = last_cmd->status;
  }

  // Clean up all the commands
  for (auto c : commands) {
    delete c;
  }

  return (WIFEXITED(status)) ? WEXITSTATUS(status) : -1;
}

// run_pipeline(shell_parser pipeline)
//    Runs a pipeline, which is a sequence of commands separated by pipe
//    operators. Checks for pipe operators and redirects, and modifies the
//    command structs accordingly. Returns the status of the last command in
//    the pipeline.

int run_pipeline(shell_parser pipeline) {
  std::vector<command *> commands; // Vector of all the commands in pipeline
  command *current_command = new command; // Current command being processed

  // Parse the pipeline and any pipe operators
  for (auto tok = pipeline.first_token(); tok; tok.next()) {
    // If we hit a pipe operator, push the current command to the vector
    // and create a new command (to be used in the next iteration)
    if (tok.type() == TYPE_PIPE) {
      commands.push_back(current_command);
      current_command = new command;

    } else if (tok.type() == TYPE_REDIRECT_OP) {
      std::string redirect_op = tok.str();

      // Navigate to the file name, which is the next argument.
      // If the file name is not a normal token, return failure
      tok.next();
      if (!tok || tok.type() != TYPE_NORMAL) {
        return -1;
      }

      // Input redirections
      // array of valid input redirections
      // Handle redirections using a more direct approach
      if (redirect_op == "<") {
        current_command->input_file = tok.str();
        current_command->input_redirect_op = redirect_op;
      } else if (redirect_op == ">" || redirect_op == ">>") {
        current_command->output_file = tok.str();
        current_command->output_redirect_op = redirect_op;

      // NEW INPUT REDIRECTIONS, VIA EXTRA CREDIT
      } else if (redirect_op == "2>") {
        current_command->error_file = tok.str();
        current_command->error_redirect_op = redirect_op;
      } else if (redirect_op == "&>") {
        current_command->error_file = tok.str();
        current_command->error_redirect_op = redirect_op;

        current_command->output_file = tok.str();
        current_command->output_redirect_op = redirect_op;
      }
    } else {
      current_command->args.push_back(tok.str());
    }
  }

  // Push the last command to the vector, if it is not empty
  if (!current_command->args.empty()) {
    commands.push_back(current_command);
  } else {
    delete current_command;
  }

  // Set up pipes between commands
  for (size_t i = 0; i < commands.size() - 1; ++i) {
    int pipefd[2]; // Array to hold the pipe file descriptors
    if (pipe(pipefd) == -1) {
      perror("pipe");
      return -1;
    }

    // Assign the write and read ends of the pipe to the respective commands
    // Note: the first command utilizes stdin, and therefore does not have an
    // input pipe specified here. The last command utilizes stdout, and
    // therefore does not have an output pipe specified here.

    commands[i]->output_pipe = pipefd[1];    // Write end
    commands[i + 1]->input_pipe = pipefd[0]; // Read end
  }

  // Run all commands in the pipeline in parallel, and then
  // return the status of the last command (the status of the pipeline)
  return run_commands(commands);
}

// run_conditional(shell_parser conditional)
//    Runs a conditional, which may contain multiple pipelines.
//    If the conditional is a background chain, it will fork a child
//    process to run the conditional in the background.

int run_conditional(shell_parser conditional) {
  // Loop through each pipeline in the conditional
  for (shell_parser pipeline = conditional.first_pipeline(); pipeline;
       pipeline.next_pipeline()) {
    int last_status = run_pipeline(pipeline);

    // Skip the next pipeline in this conditional if the last command
    // failed and this is an AND conditional, or if the last command
    // succeeded and this is an OR conditional
    int op = pipeline.op();
    if ((op == TYPE_AND && last_status != 0) ||
        (op == TYPE_OR && last_status == 0)) {

      // Skip until we hit a different operator or end of
      // conditional, to handle chain conditionals
      while (pipeline && pipeline.op() == op) {
        pipeline.next_pipeline();
      }
    }
  }
  return 0;
}

// run_list(c)
//    Run the command *list* contained in `section`.
//
//    PHASE 1: Use `waitpid` to wait for the command started by `c->run()`
//        to finish.
//
//    The remaining phases may require that you introduce helper functions
//    (e.g., to process a pipeline), write code in `command::run`, and/or
//    change `struct command`.
//
//    It is possible, and not too ugly, to handle lists, conditionals,
//    and pipelines entirely within `run_list`, but in general it is clearer
//    to introduce `run_conditional` and `run_pipeline` functions that
//    are called by `run_list`. Itâ€™s up to you.
//
//    PHASE 2: Introduce a loop to run a list of commands, waiting for each
//       to finish before going on to the next.
//    PHASE 3: Change the loop to handle conditional chains.
//    PHASE 4: Change the loop to handle pipelines. Start all processes in
//       the pipeline in parallel. The status of a pipeline is the status of
//       its LAST command.
//    PHASE 5: Change the loop to handle background conditional chains.
//       This may require adding another call to `fork()`!

void run_list(shell_parser command_line) {
  for (shell_parser conditional = command_line.first_conditional(); conditional;
       conditional.next_conditional()) {
    bool background = (conditional.op() == TYPE_BACKGROUND);
    if (background) {
      pid_t bg_pid = fork();
      if (bg_pid == -1) {
        perror("Error forking background process");
        return;
      }
      if (bg_pid == 0) {  
        setpgid(0, 0);
        int status = run_conditional(conditional);
        _exit(status);
      }
    } else {
      run_conditional(conditional);
    }
  }
}

int main(int argc, char *argv[]) {
  FILE *command_file = stdin;
  bool quiet = false;

  // Set up signal handler for SIGINT for the shell
  set_signal_handler(SIGINT, handle_sigint);

  // Ignore SIGTTOU signal. For some reason, this is sent to the shell
  // after commands that output to the terminal. This fixes it.
  set_signal_handler(SIGTTOU, SIG_IGN);

  // Check for `-q` option: be quiet (print no prompts)
  if (argc > 1 && strcmp(argv[1], "-q") == 0) {
    quiet = true;
    --argc, ++argv;
  }

  // Check for filename option: read commands from file
  if (argc > 1) {
    command_file = fopen(argv[1], "rb");
    if (!command_file) {
      perror(argv[1]);
      return 1;
    }
  }

  char buf[BUFSIZ];
  int bufpos = 0;
  bool needprompt = true;

  while (!feof(command_file)) {
    // Print the prompt at the beginning of the line
    if (needprompt && !quiet) {
      printf("sh61[%d]$ ", getpid());
      fflush(stdout);
      needprompt = false;
    }

    // Reap any zombie processes BEFORE reading new input
    int status;
    pid_t pid;
    while ((pid = waitpid(-1, &status, WNOHANG)) > 0) {
      // Reap child processes
      if (pid == -1 && errno != ECHILD) {
        perror("waitpid");
      }
    }

    // Read a string, checking for error or EOF
    if (fgets(&buf[bufpos], BUFSIZ - bufpos, command_file) == nullptr) {
      if (interrupted) {
        bufpos = 0;      // Reset buffer position
        interrupted = 0; // Reset interrupted flag
        printf("\n");
        needprompt = true; // Ensure prompt is displayed
        continue;          // Restart loop
      } else {
        if (ferror(command_file)) {
          perror("sh61");
        }
        break;
      }
    }

    bufpos = strlen(buf);
    if (bufpos == BUFSIZ - 1 || (bufpos > 0 && buf[bufpos - 1] == '\n')) {
      run_list(shell_parser{buf});
      bufpos = 0;
      needprompt = true;
    }
  }
}