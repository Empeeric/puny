"use strict";
/*global it,describe */
var assert = require('assert');
var _ = require('lodash');
var safe = require('safe');
var Promise = require('mpromise');

var loremIpsum = require('lorem-ipsum');
var tutils = require("./utils");

var num = 100;
var gt0sin = 0;
var _dt = null;
var _id = null;


describe('Basic', function () {
    before(function (done) {
        var test = this;
        tutils.getDb('test', true, function (err, _db) {
            test._db = _db;
            test.Dbname = "Basic-test-" + Date.now();
            test._db.collection(test.Dbname, {}, function (err, _coll) {
                test.coll = _coll;
                var p = new Promise;
                p.fulfill();
                gt0sin = 0;
                _dt = null;
                var objs = _.times(num, function (i) {
                    var d;
                    if (!_dt) _dt = d = new Date();
                    else d = new Date(_dt.getTime() + 1000 * i);
                    var obj = {
                        _dt: d,
                        dum: parseInt(i / 2),
                        num: i,
                        pum: i,
                        sub: {num: i},
                        sin: Math.sin(i),
                        cos: Math.cos(i),
                        t: 15,
                        junk: loremIpsum({count: 1, units: "paragraphs"})
                    };
                    obj.txt = obj.sin > 0 && "greater than zero" || obj.sin < 0 && "less than zero" || "zero";
                    if (obj.sin > 0 && obj.sin < 0.5)
                        gt0sin++;
                    return obj;
                });
                test.coll.insert(objs, done);
            });
        });
    });


    describe('New store', function () {
        it("Has right size", function (done) {
            this.coll.count(function (err, count) {
                assert.equal(count, num);
                done(err);
            });
        });
    });


    describe('Existing store', function () {
        var db, coll;
        before(function (done) {
            var test = this;
            tutils.getDb('test', false, function (err, _db) {
                db = _db;
                db.collection(test.Dbname, {}, function (err, _coll) {
                    coll = _coll;
                    done();
                });
            });
        });

        after(function (done) {
            coll.drop(function () {
                done();
            });
        });


        it("Collection.count", function (done) {
            coll.count(function (err, count) {
                assert.equal(count, num);
                done(err);
            });
        });
        it("utf8 text", function (done) {
            coll.find({ sin: { $gt: 0 } }).toArray(function (err, docs) {
                if (err) throw err;
                assert(!_.isEmpty(docs));
                docs.forEach(function (doc) {
                    assert.equal(doc.txt, "greater than zero");
                });
                done();
            });
        });
        it("find $eq", function (done) {
            coll.find({num: 10}).toArray(safe.sure(done, function (docs) {
                var doc = docs[0];
                _id = doc._id;
                assert.equal(doc.num, 10);
                assert.equal(docs.length, 1);
                assert.equal(_.isDate(doc._dt), true);
                done();
            }));
        });
        it("find date", function (done) {
            coll.find({"_dt": _dt}).toArray(safe.sure(done, function (docs) {
                assert.equal(docs.length, 1);
                assert.equal(docs[0]._dt.toString(), _dt.toString());
                done();
            }));
        });
        it("find date range", function (done) {
            var start = new Date(_dt.getTime() + 5000);
            var end = new Date(start.getTime() + 20000);
            coll.find({ "_dt": { $gt: start, $lt: end } }).toArray(safe.sure(done, function (docs) {
                assert.equal(docs.length, 19);
                done();
            }));
        });
        it("find date range inclusive", function (done) {
            var start = new Date(_dt.getTime() + 5000);
            var end = new Date(start.getTime() + 20000);
            coll.find({ "_dt": { $gte: start, $lte: end } }).toArray(safe.sure(done, function (docs) {
                assert.equal(docs.length, 21);
                done();
            }));
        });
        it("find ObjectID", function (done) {
            coll.find({"_id": _id}).toArray(safe.sure(done, function (docs) {
                assert.equal(1, docs.length);
                assert.equal(docs[0]._id.constructor.name == "ObjectID", true);
                assert.equal(docs[0]._id.toString(), _id.toString());
                done();
            }));
        });
        it("find by two index fields", function (done) {
            coll.find({num: {$lt: 30}, sin: {$lte: 0}}).toArray(safe.sure(done, function (docs) {
                assert.equal(docs.length, 15);
                done();
            }));
        });
        it("average query", function (done) {
            coll.find({sin: {$gt: 0, $lt: 0.5}, t: 15}).toArray(safe.sure(done, function (docs) {
                assert.equal(docs.length, gt0sin);
                done();
            }));
        });
        it("sort ascending no index", function (done) {
            coll.find({num: {$lt: 11}}).sort({num: 1}).toArray(safe.sure(done, function (docs) {
                assert.equal(docs.length, 11);
                assert.equal(docs[0].num, 0);
                done();
            }));
        });
        it("sort descending no index", function (done) {
            coll.find({num: {$lt: 11}}).sort({num: -1}).toArray(safe.sure(done, function (docs) {
                assert.equal(docs.length, 11);
                assert.equal(docs[0].num, 10);
                done();
            }));
        });
        it("sort ascending with index", function (done) {
            coll.find({pum: {$lt: 11}}).sort({num: 1}).toArray(safe.sure(done, function (docs) {
                assert.equal(docs.length, 11);
                assert.equal(docs[0].num, 0);
                done();
            }));
        });
        it("sort descending with index", function (done) {
            coll.find({pum: {$lt: 11}}).sort({num: -1}).toArray(safe.sure(done, function (docs) {
                assert.equal(docs.length, 11);
                assert.equal(docs[0].num, 10);
                done();
            }));
        });
        it("find with exclude fields {junk:0}", function (done) {
            coll.find({num: 10}, {junk: 0}).toArray(safe.sure(done, function (docs) {
                assert.equal(docs[0].junk, null);
                done();
            }));
        });
        it.skip("find with exclude fields {'sub.num':0,junk:0}", function (done) {
            coll.find({num: 10}, {'sub.num': 0, junk: 0}).toArray(safe.sure(done, function (docs) {
                assert.equal(docs[0].junk, null);
                assert.equal(docs[0].sub.num, null);
                done();
            }));
        });
        it("find with fields {'num':1}", function (done) {
            coll.find({num: 10}, {'num': 1}).toArray(safe.sure(done, function (docs) {
                assert.equal(_.size(docs[0]), 2);
                assert.equal(docs[0].num, 10);
                done();
            }));
        });

        it("find with fields {'sub.num':1}", function (done) {
            coll.find({num: 10}, {'sub.num': 1}).toArray(function (err, docs) {
                if (err) throw err;
                var doc = docs[0];
                assert.equal(_.size(doc), 2);
                assert.equal(doc.sub.num, 10);
                done();
            });
        });

        it("dummy update", function (done) {
            coll.update({pum: 11}, {$set: {num: 10, "sub.tub": 10, "sub.num": 10}, $unset: {sin: 1}}, function (err) {
                if (err) throw err;
                coll.find({pum: 11}).toArray(function (err, docs) {
                    assert.equal(docs.length, 1);
                    var obj = docs[0];
                    assert.equal(obj.pum, 11);
                    assert.equal(obj.num, 10);
                    assert.equal(obj.sub.num, 10);
                    assert.equal(obj.sub.tub, 10);
                    assert.equal(obj.sin, null);
                    done(err);
                }).end();
            });
        });

        it("$unset and $inc on subfields", function (done) {
            coll.update({pum: 11}, {$unset: {"sub.tub": 1}, $inc: {"sub.num": 5, "sub.pum": 3}}, function (err) {
                if (err) throw err;
                coll.find({pum: 11}).toArray(function (err, docs) {
                    assert.equal(docs.length, 1);
                    var obj = docs[0];
                    assert.equal(obj.pum, 11);
                    assert.equal(obj.sub.tub, null);
                    assert.equal(obj.sub.num, 15);
                    assert.equal(obj.sub.pum, 3);
                    done(err);
                });
            });
        });

        it("multi update", function (done) {
            coll.update({dum: 1}, {$set: {pum: 10}}, {multi: true}, function (err) {
                if (err) throw err;
                coll.find({dum: 1}).sort({num: 1}).toArray(function (err, docs) {
                    assert.equal(docs.length, 2);
                    assert.equal(docs[0].num, 2);
                    assert.equal(docs[1].num, 3);
                    done(err);
                });
            });
        });

        it("dummy remove", function (done) {
            coll.remove({pum: 20}, function (err) {
                if (err) throw err;
                coll.findOne({pum: 20}, done);
            });
        });
    });
});


describe('C.R.U.D.', function () {
    var db, coll;

    before(function (done) {
        tutils.getDb('test', true, function (err, _db) {
            db = _db;
            db.collection("test", {}, function (err, _coll) {
                coll = _coll;
                done();
            });
        });
    });

    describe('Should save', function () {
        var obj;
        it('create new', function (done) {
            obj = {i: 1, j: 1};
            coll.save(obj, done);
        });
        it('id is assigned', function (done) {
            assert(obj._id);
            done();
        });
        it('modify it', function (done) {
            obj.i++;
            coll.save(obj).then(
                function () {
                    return coll.findOne({_id: obj._id});
                }
            ).then(
                function (obj1) {
                    assert.deepEqual(obj1, obj);
                }
            ).onResolve(done);
        });
        it('delete it', function (done) {
            coll.remove({_id: obj._id}, safe.sure(done, function () {
                coll.findOne({_id: obj._id}, {sort: {i: 1}}, safe.sure(done, function (obj1) {
                    assert(!obj1);
                    done();
                }));
            }));
        });
    });

    describe('Should update', function () {
        it('create with upsert and $set apply $set to query', function (done) {
            var obj = this.obj = {j: 3, c: "multi", a: [1, 2, 3, 4, 5]};
            var q = {i: 2};
            coll.remove(q).then(
                function () {
                    return coll.update(q, {$set: obj}, {upsert: true});
                }
            ).then(
                function (n, r) {
                    assert.equal(n, 1);
                    assert.equal(r.updatedExisting, false);
                    assert(r.upserted);
                    return coll.findOne(q);
                }
            ).then(
                function (obj1) {
                    assert.equal(obj1.i, q.i);
                    done();
                }
            ).end();
        });
        it('update array field is possible', function (done) {
            coll.update({i: 2}, {$set: {a: [1, 2]}}).then(
                function (n, r) {
                    assert.equal(n, 1);
                    assert.equal(r.updatedExisting, true);
                    return coll.findOne({i: 2});
                }
            ).then(
                function (obj1) {
                    assert.deepEqual([1, 2], obj1.a);
                    done();
                }
            ).end();
        });
        it('upsert one more did not touch initial object', function (done) {
            var obj = this.obj = {j: 4, i: 3, c: "multi", a: [1, 2, 3, 4, 5]};
            var clone = _.cloneDeep(this.obj);
            var q = {i: 3};
            coll.remove(q).then(
                function () {
                    return coll.update(q, {$set: obj}, {upsert: true});
                }
            ).then(
                function (n, r) {
                    assert.equal(n, 1);
                    assert.equal(r.updatedExisting, false);
                    assert(r.upserted);
                    return coll.findOne(q);
                }
            ).then(
                function (obj1) {
                    assert.deepEqual(obj, clone);
                    clone._id = obj1._id;
                    assert.deepEqual(obj1, clone);
                    done();
                }
            ).end();
        });
        it('modify multi changes only specific field for many documents', function (done) {
            coll.update({c: "multi"}, {$set: {a: []}}, {multi: true}).then(
                function (n, r) {
                    assert.equal(n, 2);
                    assert.equal(r.updatedExisting, true);
                    return coll.find({c: "multi"}).exec();
                }
            ).then(
                function (docs) {
                    assert(docs[0].j, docs[1].j);
                    _.each(docs, function (doc) {
                        assert.deepEqual(doc.a, []);
                    });
                    done();
                }
            ).end(done);
        });
        it('update with setting of _id field is not possible', function (done) {
            coll.update({c: "multi"}, {$set: {_id: "newId"}}, {multi: true}, function (err, res) {
                assert(_.isUndefined(res));
                assert(err);
                done();
            });
        });
    });

    describe("should insert", function () {
        it("works with String id", function (done) {
            coll.insert({_id: "some@email.goes.here.com", data: "some data"}, safe.sure(done, function () {
                coll.findOne({_id: "some@email.goes.here.com"}, safe.sure(done, function (obj) {
                    assert(obj);
                    done();
                }));
            }));
        });
        it("works with Date id", function (done) {
            var _id = new Date();
            coll.insert({_id: _id, data: "some data"}, safe.sure(done, function () {
                coll.findOne({_id: _id}, safe.sure(done, function (obj) {
                    assert(obj);
                    done();
                }));
            }));
        });
        it("works with Number id", function (done) {
            var _id = 1976;
            coll.insert({_id: _id, data: "some data"}, safe.sure(done, function () {
                coll.findOne({_id: _id}, safe.sure(done, function (obj) {
                    assert(obj);
                    done();
                }));
            }));
        });
    });

    describe("Distinct", function () {
        before(function (done) {
            coll.insert([
                { name: 'exec', age: 1 },
                { name: 'exec', age: 2 }
            ], done);
        });

        it("works", function (done) {
            coll.distinct('age', {name: 'exec'}, function (err, docs) {
                if (err) throw err;
                assert(2, docs.length);
                done();
            });
        });
    });
})
;
