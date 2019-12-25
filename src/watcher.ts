import {spawn, ChildProcess} from "child_process";
import {ConfigType} from "@cley_faye/loadconfig/lib/configtype";
import {OptionType} from "@cley_faye/loadconfig/lib/optiontype";
import loadConfig from "@cley_faye/loadconfig";
import chalk from "chalk";
import treeKill from "tree-kill";

export interface WatcherOptions extends ConfigType {
  command: Array<string>;
}

/** Output each line of fullOutput prefixed with the process name */
const formatProcessOutput = (
  processName: string,
  error: boolean,
  fullOutput: string
): void => {
  const lines = fullOutput.toString().trim().split("\n");
  const coloredName = error
    ? chalk.red(`ERR ${processName}`)
    : chalk.white(`OUT ${processName}`);
  lines.forEach(line => {
    console.log(`[${coloredName}] ${line}`);
  });
};

/** Split string into separate tokens */
const splitCommandArgs = (
  commandString: string
): Array<string> => {
  const re = /(?:(?:\\\s|[^\s"])+|"[^"]*")+/g;
  return (commandString.match(re) as Array<string>).map(arg => {
    if (arg.startsWith("\"") && arg.endsWith("\"")) {
      return arg.substr(1, arg.length - 2);
    }
    return arg;
  });
};

/** Cut a command string to a suitable command/args for spawn() */
const commandStringToSpawnArgs = (
  commandString: string
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
    }
  );
  result.stdout.on(
    "data",
    data => formatProcessOutput(commandString, false, data)
  );
  result.stderr.on(
    "data",
    data => formatProcessOutput(commandString, true, data)
  );
  formatProcessOutput(
    "watchers",
    false,
    `Spawned ${spawnArgs.command} with PID ${result.pid}`
  );
  return result;
};

/** Callback for when the list of process is emptied */
type EmptyCallback = () => void;

/** Remove a process from a list */
const removeProcess = (
  process: ChildProcess,
  list: Array<ChildProcess>,
  onEmpty: EmptyCallback
): void => {
  const index = list.indexOf(process);
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
  process: ChildProcess,
  list: Array<ChildProcess>,
  onEmpty: EmptyCallback
): void => {
  list.push(process);
  const castedProcess = ((process as unknown) as Record<string, Array<string>>);
  const name = castedProcess.spawnargs && castedProcess.spawnargs.join(" ")
    || process.pid.toString()
    || "???";
  process.on(
    "error",
    () => {
      formatProcessOutput(
        "watchers",
        true,
        `Process ${name} failed to start`
      );
      removeProcess(process, list, onEmpty);
    }
  );
  process.on(
    "exit",
    (code: number) => {
      formatProcessOutput(
        "watchers",
        code != 0,
        `Process ${name}(${process.pid}) ended with code ${code}`
      );
      removeProcess(process, list, onEmpty);
    }
  );
};

const allProcessExited = (): void => {
  formatProcessOutput(
    "watchers",
    false,
    "All process completed; exiting"
  );
  process.exit(0);
};

export const watcher = (options: WatcherOptions): void => {
  const {command: commands} = options;
  if (commands.length == 0) {
    console.log("No commands provided");
    process.exit(1);
  }
  const activeProcess: Array<ChildProcess> = [];
  commands.map(command => spawnProcess(
    command
  )).forEach(process => registerProcess(
    process,
    activeProcess,
    allProcessExited
  ));
  formatProcessOutput(
    "watchers",
    false,
    "All process started; press 'q' to exit them all"
  );
  process.stdin.setRawMode(true);
  process.stdin.on("data", (data: string): void => {
    if (data.toString().toLowerCase() === "q") {
      activeProcess.forEach(process => treeKill(process.pid));
    }
  });
};

export const main = (): void => {
  loadConfig<WatcherOptions>(
    {
      command: {
        type: OptionType.STRING,
        multiple: true,
        defaultValue: [],
      },
    },
    "watchers"
  ).then(watcher);
};
