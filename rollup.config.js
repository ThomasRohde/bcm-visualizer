import typescript from 'rollup-plugin-typescript2';

export default [
  // Browser UMD build
  {
    input: 'src/browser.ts',
    output: {
      file: 'dist/diagram-generator.umd.js',
      format: 'umd',
      name: 'DiagramGenerator',
      sourcemap: true
    },
    plugins: [
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            module: "ES2015"
          }
        }
      })
    ]
  },
  // Browser ESM build
  {
    input: 'src/browser.ts',
    output: {
      file: 'dist/diagram-generator.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            module: "ES2015"
          }
        }
      })
    ]
  }
];
