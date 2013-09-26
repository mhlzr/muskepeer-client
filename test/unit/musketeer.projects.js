/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */

var assert = chai.assert,
    expect = chai.expect,
    should = chai.should;

describe('Musketeer.projects', function () {

    describe('#join', function () {

        it('should exist and be a function', function () {
            Musketeer.projects.join.should.exist.and.be.a.function;
        });

        it('should add an element to the list array', function () {
            var id = 'foo';
            Musketeer.projects.join(id).should.be.okay;
            Musketeer.projects.list.should.contain(id);
        });


    });


});
