import typescript from 'rollup-plugin-typescript2';

export default [
  // Browser UMD build
  {
    input: 'src/browser.ts',
    output: {
      file: 'dist/diagram-generator.umd.js',
      format: 'umd',
      name: 'DiagramGenerator',
      sourcemap: true,
      exports: 'named',
      globals: {
        '@svgdotjs/svg.js': 'SVG',
        'svgdom': 'svgdom'
      }
    },
    plugins: [
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            module: "ES2020"
          }
        }
      })
    ],
    external: ['@svgdotjs/svg.js', 'svgdom']
  },
  // Browser ESM build
  {
    input: 'src/browser.ts',
    output: {
      file: 'dist/diagram-generator.esm.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            module: "ES2020"
          }
        }
      })
    ],
    external: ['@svgdotjs/svg.js', 'svgdom']
  }
];
