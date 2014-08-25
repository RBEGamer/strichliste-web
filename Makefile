install:
	@npm install

development: install
	@node devServer.js &
	@./node_modules/gulp/bin/gulp.js dev

production: install
	@NODE_ENV=production ./node_modules/gulp/bin/gulp.js build
