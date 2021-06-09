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
        "bin",
        ".tscache",
      ],
    },
    "ts": {
      build: {
        tsconfig: {
          tsconfig: "./",
          passThrough: true,
        },
      },
    },
    "usebanner": {
      options: {banner: licenseJS},
      build: {
        files: [{
          expand: true,
          cwd: "bin",
          src: ["**/*.js"],
        }],
      },
    },
  });

  grunt.registerTask(
    "build",
    "Build the project into JavaScript files",
    [
      "ts:build",
      "usebanner:build",
    ],
  );

  grunt.registerTask(
    "default",
    "build",
  );
};
