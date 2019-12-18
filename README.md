# @cleyfaye/watchers

Run multiple process simultaneously and kill them in one go.
While this can easily be achieved through various shell scripts in various
environments, I wanted a way to do it cross-platforms.

There's only one use-case: run multiple processes that stay running (like
build tools in watch mode) and don't require inputs. All their output is
displayed as the main process output, and a single kill command will stop all
processes.
