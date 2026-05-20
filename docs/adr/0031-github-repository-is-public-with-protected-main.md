# GitHub repository is public with protected main

The canonical GitHub repository is public at `https://github.com/blankhoney/reno_news`. The default branch is `main`.

`main` is protected with required status checks for JavaScript lint/test/build, Python worker tests, PostgreSQL integration tests, and Docker Compose config validation. Pull requests require one approving review, stale reviews are dismissed, conversation resolution is required, and force pushes and branch deletion are disabled.

The `production` environment exists with deployment branch policy limited to protected branches and `blankhoney` as a required reviewer. Production deployment still requires explicit secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_COMMAND`.

Making the repository public enables GitHub branch and environment protection controls for this project without changing the deployment boundary. The repository is public, but production remains blocked until server layout, secrets, backup policy, monitoring, alerting, rollback ownership, and incident response are configured.
