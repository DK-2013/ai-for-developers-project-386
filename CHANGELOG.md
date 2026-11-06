# Changelog

## [0.2.0](https://github.com/DK-2013/ai-for-developers-project-386/compare/v0.1.0...v0.2.0) (2026-11-06)


### Features

* **booking:** create bookings with overlap protection and a guest flow ([#7](https://github.com/DK-2013/ai-for-developers-project-386/issues/7)) ([eb8bef7](https://github.com/DK-2013/ai-for-developers-project-386/commit/eb8bef72400bb27b35cc25cd191ed3513cfc614f))
* **bookings:** list upcoming bookings in the owner cabinet ([#8](https://github.com/DK-2013/ai-for-developers-project-386/issues/8)) ([21b4f16](https://github.com/DK-2013/ai-for-developers-project-386/commit/21b4f1679940a7d3a2c82ddb7145c36aaca15cda))
* **slots:** compute free slots and render the guest calendar ([#6](https://github.com/DK-2013/ai-for-developers-project-386/issues/6)) ([f2a31a3](https://github.com/DK-2013/ai-for-developers-project-386/commit/f2a31a348656a550d45d3c34c67ef8569d3397c1))


### Bug Fixes

* address spec 3 review findings ([#3](https://github.com/DK-2013/ai-for-developers-project-386/issues/3)) ([b71c498](https://github.com/DK-2013/ai-for-developers-project-386/commit/b71c4987183b59b63fdc5e0bcdb5c82e02963df4))
* **ci:** exclude generated CHANGELOG.md from rumdl ([93be6b1](https://github.com/DK-2013/ai-for-developers-project-386/commit/93be6b1b559c24dfc1924112d89f38148e361b34))
* **server:** wrap repository query errors with causes ([#3](https://github.com/DK-2013/ai-for-developers-project-386/issues/3)) ([8b7499d](https://github.com/DK-2013/ai-for-developers-project-386/commit/8b7499d6ddc863e5f468ad1bbd2c5b31281a1a31))
* **tools:** pin the compose project and drop the db daemon ([6cc164a](https://github.com/DK-2013/ai-for-developers-project-386/commit/6cc164a97a3dbb110c807d9ced4b923af41608be))

## 0.1.0 (2026-11-05)


### Features

* define the booking contract and route it through generated code ([17e7e74](https://github.com/DK-2013/ai-for-developers-project-386/commit/17e7e741d8460775d0082171e67c677549aa8cde))
* **server:** persist meeting types in PostgreSQL ([#4](https://github.com/DK-2013/ai-for-developers-project-386/issues/4)) ([52066bb](https://github.com/DK-2013/ai-for-developers-project-386/commit/52066bb54f4561ef812262839aab51e4c7b019d2))
* **server:** seed a default meeting type at startup ([d6e2782](https://github.com/DK-2013/ai-for-developers-project-386/commit/d6e2782c6202853edc9831021840019fc0cdae61)), closes [#21](https://github.com/DK-2013/ai-for-developers-project-386/issues/21)
* **web:** add meeting type creation form ([#4](https://github.com/DK-2013/ai-for-developers-project-386/issues/4)) ([c26146f](https://github.com/DK-2013/ai-for-developers-project-386/commit/c26146fa2a70ecaeb6ce4b4d677463f0205576cc))
* **web:** add owner cabinet stub and smoke test ([65c7bb1](https://github.com/DK-2013/ai-for-developers-project-386/commit/65c7bb1e3f5d4123ac1fadaa1066a8d13a2d444f))
* **web:** add the booking route and extract the meeting types view ([304d001](https://github.com/DK-2013/ai-for-developers-project-386/commit/304d001e0ef662807a1561d01f029356801a372b))


### Bug Fixes

* address review findings for meeting types ([#4](https://github.com/DK-2013/ai-for-developers-project-386/issues/4)) ([a90d022](https://github.com/DK-2013/ai-for-developers-project-386/commit/a90d022e67213dae833d7568eb2648193d14cd0f))
* **agents:** make vendored skills pass agnix strict validation ([c59e708](https://github.com/DK-2013/ai-for-developers-project-386/commit/c59e7080accd2b0907de0b4176b7f353e2363d55))
* **ci:** stop the check task from starting a second PostgreSQL ([72fed5c](https://github.com/DK-2013/ai-for-developers-project-386/commit/72fed5c38686c0daa1eaf7ad8b38c1745b41f583))
* **release:** start release-please at 0.1.0 ([05dcf93](https://github.com/DK-2013/ai-for-developers-project-386/commit/05dcf9349600aea63f0058c6a0b747384104ecc6))
* **security:** load betterleaks filter from top level ([d43f463](https://github.com/DK-2013/ai-for-developers-project-386/commit/d43f46356b6aa5007f7d5ad046a64d1f89ec3a69))
* **server:** configure drizzle-kit so db:generate runs ([7e1cba5](https://github.com/DK-2013/ai-for-developers-project-386/commit/7e1cba55eedb3b01a648ab463bf36a5cbe8b92de))
* **server:** cover database startup with a prepare seam ([#21](https://github.com/DK-2013/ai-for-developers-project-386/issues/21)) ([610489a](https://github.com/DK-2013/ai-for-developers-project-386/commit/610489a21478a16ad5849b40305687d78ef80c4f))
* **server:** include test directory in vitest config ([8767b5a](https://github.com/DK-2013/ai-for-developers-project-386/commit/8767b5ae02770ee4e044faf53a54d1c9cdd85835))
* **spec:** add health endpoint for codegen ([091434c](https://github.com/DK-2013/ai-for-developers-project-386/commit/091434c2d2ff1f532223b6d0fb3269ea11470620))
* **spec:** require slot durations in 15-minute steps ([d3e6994](https://github.com/DK-2013/ai-for-developers-project-386/commit/d3e6994a0df2d32451573928f07e24378c1c13f0))
* **web:** build an absolute SDK endpoint ([#13](https://github.com/DK-2013/ai-for-developers-project-386/issues/13)) ([546a4ef](https://github.com/DK-2013/ai-for-developers-project-386/commit/546a4eff7d38436c749044c5b6b1d52d2522cfbf))
