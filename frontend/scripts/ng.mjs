// Runs the Angular CLI with the pure-JavaScript Sass compiler.
// The default compiler (sass-embedded) starts a native dart.exe, which Windows Smart App Control can block
// ("An Application Control policy has blocked this file"). Set NG_BUILD_SASS_EMBEDDED=1 to use it anyway.
process.env.NG_BUILD_SASS_EMBEDDED ??= '0';
await import('@angular/cli/bin/ng.js');
