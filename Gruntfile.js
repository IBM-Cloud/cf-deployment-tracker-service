module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    jshint: {
      options : {
        jshintrc: ".jshintrc",
        ignores : [ "node_modules/**/*.js" ]
      },
      src: ["Gruntfile.js", "app.js", "admin.js"],
    },
    jscs: {
      src: ["Gruntfile.js", "app.js", "admin.js"],
      options: {
        config: ".jscsrc",
        esnext: true, // If you use ES6 http://jscs.info/overview.html#esnext
        verbose: true, // If you need output with rule names http://jscs.info/overview.html#verbose
        requireCurlyBraces: [ "if" ]
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-jshint");

  grunt.registerTask("default", [ "lint", "jscs" ]);

  grunt.loadNpmTasks("grunt-jscs");

  grunt.registerTask("lint", "Check for common code problems.", [ "jshint" ]);
};
