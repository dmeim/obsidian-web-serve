import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const name = 'web-serve';

const config = {
  input: 'src/plugin/main.ts',
  external: ['obsidian'],
  output: {
    file: 'main.js',
    sourcemap: false,
    format: 'cjs',
    exports: 'default',
    name,
  },
  plugins: [
    json(),
    nodeResolve({ preferBuiltins: true }),
    cjs({ include: 'node_modules/**' }),
    typescript({ tsconfig: './tsconfig.json' }),
    terser({ compress: true, mangle: true }),
  ],
};

export default config;
