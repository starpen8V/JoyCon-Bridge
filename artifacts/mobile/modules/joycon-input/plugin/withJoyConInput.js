// @ts-check
const { withMainActivity } = require("@expo/config-plugins");

/**
 * Config plugin: injects JoyCon gamepad event hooks into MainActivity.kt.
 * This is the only way to intercept dispatchGenericMotionEvent (analog sticks)
 * in Expo's managed workflow.
 */
module.exports = function withJoyConInput(config) {
  return withMainActivity(config, (mod) => {
    let src = mod.modResults.contents;

    // ── 1. Add imports (idempotent) ────────────────────────────────────────
    if (!src.includes("expo.modules.joyconinput.JoyConInputModule")) {
      src = src.replace(
        /^(import com\.facebook\.react\.ReactActivity)/m,
        [
          "import android.view.KeyEvent",
          "import android.view.MotionEvent",
          "import expo.modules.joyconinput.JoyConInputModule",
          "$1",
        ].join("\n")
      );
    }

    // ── 2. Add overrides before the final closing brace (idempotent) ───────
    if (!src.includes("JoyConInputModule.handleKeyEvent")) {
      const overrides = `
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    JoyConInputModule.handleKeyEvent(event)
    return super.dispatchKeyEvent(event)
  }

  override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
    JoyConInputModule.handleMotionEvent(event)
    return super.dispatchGenericMotionEvent(event)
  }`;

      // Insert just before the last closing brace of the class
      const lastBrace = src.lastIndexOf("}");
      src = src.substring(0, lastBrace) + overrides + "\n" + src.substring(lastBrace);
    }

    mod.modResults.contents = src;
    return mod;
  });
};
