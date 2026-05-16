(function () {
  const IMAGE_TIMEOUT_MS = 12000;

  function waitForImage(image) {
    image.loading = "eager";
    image.decoding = "sync";
    if ("fetchPriority" in image) image.fetchPriority = "high";

    if (image.complete) {
      return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
    }

    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
        resolve();
      };

      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, IMAGE_TIMEOUT_MS);
    }).then(() => (image.decode ? image.decode().catch(() => {}) : undefined));
  }

  async function waitForPrintableAssets(root) {
    if (!root) return;
    const images = [...root.querySelectorAll("img")];
    await Promise.all(images.map(waitForImage));
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function printWhenReady(root, trigger) {
    const originalLabel = trigger?.textContent;
    if (trigger) {
      trigger.disabled = true;
      trigger.textContent = "Preparing print...";
    }
    await waitForPrintableAssets(root);
    window.print();
    if (trigger) {
      trigger.disabled = false;
      trigger.textContent = originalLabel;
    }
  }

  window.ElitePrint = {
    printWhenReady,
    waitForPrintableAssets
  };
})();
