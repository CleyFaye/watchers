import {spawn, ChildProcess} from "child_process";
import {ConfigType} from "@cley_faye/loadconfig/lib/configtype";
import {OptionType} from "@cley_faye/loadconfig/lib/optiontype";
import loadConfig from "@cley_faye/loadconfig";
import chalk from "chalk";
import treeKill from "tree-kill";
import ansiSeq from "ansi-escape-sequences";

export interface WatcherOptions extends ConfigType {
  command: Array<string>;
}

// eslint-disable-next-line no-console
const log = (...args: Array<unknown>) => console.log(...args);

/** Output each line of fullOutput prefixed with the process name */
const formatProcessOutput = (
  processName: string,
  error: boolean,
  fullOutput: string,
): void => {
  const lines = fullOutput.toString().trim()
    .split("\n");
  const MAX_NAME_LEN = 15;
  const coloredName = error
    ? chalk.red(`ERR ${processName.substr(0, MAX_NAME_LEN)}`)
    : chalk.white(`OUT ${processName.substr(0, MAX_NAME_LEN)}`);
  lines.forEach(line => {
    log(`[${coloredName}] ${line}`);
  });
};

/** Split string into separate tokens */
const splitCommandArgs = (
  commandString: string,
): Array<string> => {
  const re = /(?:(?:\\\s|[^\s"])+|"[^"]*")+/gu;
  return (commandString.match(re) as Array<string>).map(arg => {
    if (arg.startsWith("\"") && arg.endsWith("\"")) {
      const argQuoteLimit = 2;
      return arg.substr(1, arg.length - argQuoteLimit);
    }
    return arg;
  });
};

/** Cut a command string to a suitable command/args for spawn() */
const commandStringToSpawnArgs = (
  commandString: string,
): {
  command: string;
  args: Array<string>;
} => {
  const split = splitCommandArgs(commandString);
  return {
    command: split[0],
    args: split.slice(1),
  };
};

/** Spawn a process, bind it's output to formatProcessOutput. */
const spawnProcess = (
  commandString: string,
): ChildProcess => {
  const spawnArgs = commandStringToSpawnArgs(commandString);
  const result = spawn(
    spawnArgs.command,
    spawnArgs.args,
    {
      shell: true,
      stdio: [
        "ignore",
        "pipe",
        "pipe",
      ],
      windowsHide: true,
    },
  );
  result.stdout.on(
    "data",
    data => formatProcessOutput(commandString, false, data),
  );
  result.stderr.on(
    "data",
    data => formatProcessOutput(commandString, true, data),
  );
  formatProcessOutput(
    "watchers",
    false,
    `Spawned ${spawnArgs.command} with PID ${result.pid}`,
  );
  return result;
};

/** Callback for when the list of process is emptied */
type EmptyCallback = () => void;

/** Remove a process from a list */
const removeProcess = (
  proc: ChildProcess,
  list: Array<ChildProcess>,
  onEmpty: EmptyCallback,
): void => {
  const index = list.indexOf(proc);
  if (index === -1) {
    return;
  }
  list.splice(index, 1);
  if (list.length === 0) {
    onEmpty();
  }
};

/** Add a process to a list, and register itself for removal once the
 * process complete.
 */
const registerProcess = (
  proc: ChildProcess,
  list: Array<ChildProcess>,
  onEmpty: EmptyCallback,
): void => {
  list.push(proc);
  const castedProcess = ((proc as unknown) as Record<string, Array<string>>);
  const name = castedProcess.spawnargs.join(" ")
    || proc.pid.toString()
    || "???";
  proc.on(
    "error",
    () => {
      formatProcessOutput(
        "watchers",
        true,
        `Process ${name} failed to start`,
      );
      removeProcess(proc, list, onEmpty);
    },
  );
  proc.on(
    "exit",
    (code: number) => {
      formatProcessOutput(
        "watchers",
        Boolean(code),
        `Process ${name}(${proc.pid}) ended with code ${code}`,
      );
      removeProcess(proc, list, onEmpty);
    },
  );
};

const allProcessExited = (): void => {
  formatProcessOutput(
    "watchers",
    false,
    "All process completed; exiting",
  );
  // eslint-disable-next-line no-process-exit
  process.exit(0);
};

const stopAllFromSignal = (activeProcess: Array<ChildProcess>) => {
  formatProcessOutput(
    "watchers",
    false,
    "Received 'SIGINT' press, stopping processes",
  );
  activeProcess.forEach(proc => treeKill(proc.pid));
};

const keyHandlerHelpers = (activeProcess: Array<ChildProcess>) => {
  process.stdin.on("data", (data: string): void => {
    const str = data.toString();
    if (str.toLowerCase() === "q") {
      formatProcessOutput(
        "watchers",
        false,
        "Received 'q' press, stopping processes",
      );
      activeProcess.forEach(proc => treeKill(proc.pid));
      return;
    }
    if (str.toLowerCase() === "c") {
      const FULLSCREEN_ERASE = 2;
      log(ansiSeq.erase.display(FULLSCREEN_ERASE));
      return;
    }
    if (str === "\u0003") {
      stopAllFromSignal(activeProcess);
      return;
    }
    if (str === "\r") {
      log("");
    }
  });
};

export const watcher = (options: WatcherOptions): void => {
  const {command: commands} = options;
  if (commands.length === 0) {
    log("No commands provided");
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
  const activeProcess: Array<ChildProcess> = [];
  commands.map(command => spawnProcess(
    command,
  )).forEach(proc => registerProcess(
    proc,
    activeProcess,
    allProcessExited,
  ));
  formatProcessOutput(
    "watchers",
    false,
    "All process started; press 'q' to exit them all, 'c' to clear console",
  );
  process.stdin.setRawMode(true);
  keyHandlerHelpers(activeProcess);
  const sigHandler = () => {
    stopAllFromSignal(activeProcess);
  };
  process.once("SIGINT", sigHandler);
};

export const main = (): void => {
  watcher(loadConfig<WatcherOptions>(
    {
      command: {
        type: OptionType.STRING,
        multiple: true,
        defaultValue: [],
      },
    },
    "watchers",
  ));
};
