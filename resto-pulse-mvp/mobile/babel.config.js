module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Hermes needs private fields/methods lowered to supported syntax.
          unstable_transformProfile: 'hermes-stable',
        },
      ],
    ],
  };
};
