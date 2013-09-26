/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */

var assert = chai.assert,
    expect = chai.expect,
    should = chai.should;

describe('Musketeer.storage', function () {

    describe('#read', function () {

        it('should exist and be a function', function () {
            Musketeer.storage.read.should.exist.and.be.a.function;
        });

        it('should not be ok if no key is passed', function () {
            Musketeer.storage.read.should.throw(/missing/);
        });

        it('should be ok if a valid key is passed', function () {
            Musketeer.storage.read('012345678910').should.be.okay;
        });

    });


});
