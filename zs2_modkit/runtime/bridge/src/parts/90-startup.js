    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
      log("poll failed", { error: bridge.lastError });
    }
  }

  ensureDir();
  log("bridge injected", { href: location.href, cwd: process.cwd() });
  patchSavePaths();
  writeState();
  const patchTimer = setInterval(function () {
    if (patchSavePaths()) {
      refreshTitleContinueCommand();
      clearInterval(patchTimer);
    }
  }, 100);
  setInterval(function () {
    preserveNoCostResources("guard");
  }, 100);
  setInterval(function () {
    writeState();
  }, 1000);
  setInterval(pollCommands, 250);
})();
