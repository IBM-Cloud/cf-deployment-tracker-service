module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    jshint: {
      options : {
        jshintrc: ".jshintrc",
        ignores : [ "node_modules/**/*.js" ]
      },
      src: ["Gruntfile.js", "lib/*.js"],
    },
    jscs: {
      src: ["Gruntfile.js", "lib/*.js"],
      options: {
        config: ".jscsrc",
        // default in 3.x+ esnext: true, // If you use ES6 http://jscs.info/overview.html#esnext
        // default in 3.x+ verbose: true, // If you need output with rule names http://jscs.info/overview.html#verbose
        requireCurlyBraces: [ "if" ]
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-jshint");

  grunt.registerTask("default", [ "lint", "jscs" ]);

  grunt.loadNpmTasks("grunt-jscs");

  grunt.registerTask("lint", "Check for common code problems.", [ "jshint" ]);
};
