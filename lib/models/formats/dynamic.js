const assert = require('assert');

const instance = require('../../helpers/weak_cache');
const ctxRef = require('../ctx_ref');

const jwt = require('./jwt');
const opaque = require('./opaque');
const paseto = require('./paseto');

const JWT_REGEX = /^(?:[a-zA-Z0-9-_]+\.){2}[a-zA-Z0-9-_]+$/;

module.exports = (provider) => {
  const formats = {
    jwt: jwt(provider),
    opaque: opaque(provider),
    paseto: paseto(provider),
  };

  return {
    generateTokenId(...args) {
      const resolver = instance(provider).dynamic[this.constructor.name];
      const format = resolver(ctxRef.get(this), this);
      assert(formats[format] && format !== 'dynamic', 'invalid format resolved');
      this.format = format;
      return formats[format].generateTokenId.apply(this, args);
    },
    async getValueAndPayload(...args) {
      const { format } = this;
      assert(formats[format] && format !== 'dynamic', 'invalid format resolved');
      return formats[format].getValueAndPayload.apply(this, args);
    },
    getTokenId(...args) {
      let format;
      const [value] = args;
      if (value && (value.length === 27 || value.length === 43)) {
        format = 'opaque';
      } else if (value.startsWith('v2.public.')) {
        format = 'paseto';
      } else if (JWT_REGEX.test(value)) {
        format = 'jwt';
      } else {
        format = 'opaque';
      }
      assert(formats[format] && format !== 'dynamic', 'invalid format resolved');
      return formats[format].getTokenId.apply(this, args);
    },
    async verify(...args) {
      const format = args[1].format || (args[1].jwt ? 'jwt' : args[1].paseto ? 'paseto' : 'opaque'); // eslint-disable-line no-nested-ternary
      assert(formats[format] && format !== 'dynamic', 'invalid format resolved');
      return formats[format].verify.apply(this, args);
    },
  };
};
