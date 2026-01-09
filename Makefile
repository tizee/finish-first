.PHONY: install-deps chrome firefox all test clean install-firefox

install-deps:
	pnpm install

chrome:
	pnpm build:chrome

firefox:
	pnpm build:firefox

all: install-deps chrome firefox

test:
	pnpm test:run

test-watch:
	pnpm test

clean:
	rm -rf dist dist-chrome dist-firefox node_modules

install-firefox: firefox
	open -a "Firefox Developer Edition" dist/*.xpi
