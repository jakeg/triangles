module.exports = {
  globals: { JG: true },
  env: { mocha: true },
  extends: [
    'eslint-config-standard' // StandardJS
    // 'plugin:vue/essential' // lint .vue files too
  ],
  // parserOptions: { parser: 'babel-eslint' },
  rules: {
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error'
    // 'vue/no-unused-vars': 'error'
  }
}
