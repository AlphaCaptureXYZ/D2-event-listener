/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/triple-slash-reference */
// REGISTER CHAI PLUGINS HERE
/// <reference path="./types/chai-like/index.d.ts" />

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var chaiLike = require('chai-like');
var chaiThings = require('chai-things');

chai.use(sinonChai);
chai.use(chaiLike);
chai.use(chaiThings);

var expect = chai.expect;
var should = chai.should();
