# @cleyfaye/watchers

Run multiple process simultaneously and kill them in one go.
While this can easily be achieved through various shell scripts in various
environments, I wanted a way to do it cross-platforms.

There's only one use-case: run multiple processes that stay running (like
build tools in watch mode) and don't require inputs. All their output is
displayed as the main process output, and a single kill command will stop all
processes.

## Configuration

It is possible to configure the `watchers` from multiple places:

 - in a separate `.watchers.json` file
 - in a separate `.watchers.js` file
 - in the `package.json` file, in a `watchers` section
 - from command line, by passing multiple time the `-command=<cmd>` argument

Example from `package.json`:

```JSON
{
  "watchers": {
    "command": [
      "cmd1",
      "cmd2 with some args",
    ]
  }
}
```

## Running

When installed the package should provide a `watchers` command in your
repository.
This command can be run using `npx watchers`.

The command will display some informations about running the requested commands
then start outputting each command's output in real time.
To stop all processes at once, press 'q' in the terminal (or, alternatively, the widely used but
only recently supported `<C-c>`).

If all process otherwise completes, the watcher will automatically end.
