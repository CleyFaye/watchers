import {ConfigType} from "@cley_faye/loadconfig/lib/configtype";
import {OptionType} from "@cley_faye/loadconfig/lib/optiontype";
import loadConfig from "@cley_faye/loadconfig";

export interface WatcherOptions extends ConfigType {
  command: Array<string>;
}

export const watcher = (options: WatcherOptions): void => {
  const {command} = options;
  console.log("Commands=", command);
};

export const main = (): void => {
  loadConfig<WatcherOptions>({
    command: {
      type: OptionType.STRING,
      multiple: true,
      defaultValue: [],
    }
  }).then(watcher);
};
