/* eslint-disable camelcase */
const loadGruntTasks = require("load-grunt-tasks");
const {readFileSync} = require("fs");

const licenseJS = [
  "/**",
  " * @license",
  " * @preserve",
  ...readFileSync("LICENSE", "utf8").split("\n")
    .map(c => ` * ${c}`.trimEnd()),
  " */",
].join("\n");

module.exports = grunt => {
  loadGruntTasks(grunt);
  grunt.initConfig({
    "clean": {
      build: [
        "lib",
      ],
      cache: [
        "**/.cache",
        ".tscache",
        ".tsbuildinfo",
      ],
    },
    "shell": {
      ts_build: {
        command: "npm exec tsc",
        stdout: true,
        stderr: true,
      },
    },
    "usebanner": {
      options: {banner: licenseJS},
      build: {
        files: [{
          expand: true,
          cwd: "lib",
          src: ["**/*.js"],
        }],
      },
    },
  });

  grunt.registerTask(
    "build",
    "Build the project into JavaScript files",
    [
      "shell:ts_build",
      "usebanner:build",
    ],
  );

  grunt.registerTask(
    "default",
    "build",
  );
};
