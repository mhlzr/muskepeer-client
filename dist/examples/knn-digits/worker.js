/**
 *
 */

var trainingFile,
    trainingData;

/**********************************************
 * COMMUNICATION BLOCK START
 **********************************************/
self.addEventListener('message', function (e) {

    if (!e.data.cmd) {
        return;
    }

    switch (e.data.cmd.toLowerCase()) {
        case 'start':
            start();
            break;
        case 'job' :
            start(e.data.job);
            break;
        case 'file' :
            if (e.data.fileInfo.name === 'training') {

                trainingFile = new Blob([e.data.file], {type: e.data.fileInfo.type});
                var json = JSON.parse(new FileReaderSync().readAsText(trainingFile));
                trainingData = json.data;

                start();
            }
            break;
        default:
            break;
    }
});
/**********************************************
 * COMMUNICATION BLOCK END
 **********************************************/

var K = 20,
    SIGMA = 40,
    KERNEL = 'rect',
    DISTANCE = 'euclid',
    SIGMA_AUTO_INCREASE = false;


function start(job) {

    // Get trainingFile
    if (!trainingFile) {
        self.postMessage({ type: 'file:pull', data: {name: 'training', type: 'arrayBuffer'} });
        return;
    }

    // Get a job
    if (!job) {
        self.postMessage({ type: 'job:pull' });
        return;
    }

    // Post result
    self.postMessage(
        {
            type: 'result:push',
            data: {
                job: { uuid: job.uuid },
                result: knn(trainingData, job.parameters.dataset[0], K, SIGMA, KERNEL, DISTANCE, SIGMA_AUTO_INCREASE, 16)
            }
        });

    // Recursion
    start();
}


/**
 * k-Nearest-Neighbour implementation in a javascript webworker
 * Classifies objects based on closest training examples in the feature space
 * http://en.wikipedia.org/wiki/K-nearest_neighbor_algorithm
 *
 * @author Matthieu Holzer
 * @date 07/01/2012
 *
 *
 * @method knn
 * @param {Object} trainingData A Object including all the trainingDataSets
 * @param {Object} testData A Object including all the testDataSets
 * @param {number} k Number of neighbours to analyze
 * @param {number} sigma Range in which the neighbours have to be located
 * @param {String} kernelFuncName The name of the kernel-function which should be used
 * @param {String} distanceFuncName The name of the distance-function which should be used
 *
 * @param {Boolean} sigmaAutoIncrease Whether you wish to autoincrease sigma to include exactly k-neighbours (might slow everything down!)
 * @param {number} classAttributePosition The index of your class-atrribute in the trainingData
 **/

function knn(trainingData, testData, k, sigma, kernelFuncName, distanceFuncName, sigmaAutoIncrease, classAttributePosition) {

    sigmaAutoIncrease = sigmaAutoIncrease || false;
    classAttributePosition = classAttributePosition || 0;

    var Kernel = {
        fn: {
            rect: function (d, sigma) {
                return (d <= sigma) ? 1 : 0;
            },
            triangle: function (d, sigma) {
                return Kernel.fn.rect(d, sigma) * (1 - d / sigma);
            },
            tricubic: function (d, sigma) {
                return Kernel.fn.rect(d, sigma) * Math.pow((1 - Math.pow(d, 3) / Math.pow(sigma, 3)), 3);
            },
            gauss: function (d, sigma) {
                return Math.exp(-((d * d) / (2 * sigma * sigma)));
            }
        }
    };


    var Distance = {
        fn: {
            //Minkowski p=1
            manhattan: function (p1, p2) {
                return Math.abs(p1 - p2);
            },
            //Minkowski p=2
            euclid: function (p1, p2) {
                return Math.pow(p1 - p2, 2);
            }
        }
    };

    var kernelFunction,
        distanceFunction = Distance.fn[distanceFuncName] || Distance.fn.euclid,
        sigmaIncreased = sigma,
        neighbours = null,
        co = null;

    if (kernelFuncName === 'none') {
        kernelFunction = null;
    } else {
        kernelFunction = Kernel.fn[kernelFuncName] || Kernel.fn.rect;
    }

    //finds the nearest neighbours
    function getNeighbours(testData, sigmaToTest) {

        var j, k, weight, minAttributesLength;
        var distance = 0,
            neighbours = [];

        //loop trainingData
        for (j = 0; j < trainingData.length; j++) {

            //it's possible that both datasets have a different amount of attributes
            minAttributesLength = Math.min(trainingData[j].length, testData.length);

            //loop testData & trainingData attributes
            for (k = 0; k < minAttributesLength; k++) {
                //no need to check this if k = classAttribute or simply not a number
                if (k === classAttributePosition || isNaN(trainingData[j][k]) || isNaN(testData[k])) {
                    continue;
                }
                distance += distanceFunction(testData[k], trainingData[j][k]);
            }

            distance = Math.sqrt(distance);

            //[ [ id, distance, weight ] ]
            if (kernelFunction === null) {
                neighbours.push([j, distance, 1]);
            } else {
                weight = kernelFunction(distance, sigmaToTest);
                if (weight > 0) {
                    neighbours.push([j, distance, weight]);
                }
            }

            //cleanup
            weight = distance = 0;

        }

        return neighbours;


    }

    //counts how many neighbours have which class, restricted by sigma or not and it's weight
    function getClassOccurencies() {
        var currentClassName;
        var classOccurencies = {
            total: {},
            weight: {},
            withinSigma: {}
        };

        neighbours.forEach(function (n) {

            currentClassName = trainingData[n[0]][classAttributePosition];

            //get class occurency total
            if (typeof classOccurencies.total[currentClassName] === 'undefined') {
                classOccurencies.total[currentClassName] = 0;
            }
            classOccurencies.total[currentClassName] += 1;

            //if weight > 0
            if (n[2] > 0) {
                //get class weights
                if (typeof classOccurencies.weight[currentClassName] === 'undefined') {
                    classOccurencies.weight[currentClassName] = 0;
                }
                classOccurencies.weight[currentClassName] += n[2];

                //get class occurency within original sigma
                if (n[1] <= sigma) {
                    if (typeof classOccurencies.withinSigma[currentClassName] === 'undefined') {
                        classOccurencies.withinSigma[currentClassName] = 0;
                    }
                    classOccurencies.withinSigma[currentClassName] += 1;
                }
            }

        });

        return classOccurencies;

    }

    //predicts the class by highest weight
    function getClassWithHighestWeight() {

        var maxClassName;

        for (var key in co.weight) {
            if (typeof maxClassName === 'undefined' || co.weight[key] > co.weight[maxClassName]) {
                maxClassName = key;
            }
        }

        return (typeof maxClassName === 'undefined') ? null : maxClassName;
    }


    // Start analysis
    // First time to look for neighbors
    neighbours = getNeighbours(testData, sigmaIncreased);

    // Increase sigma if activated
    if (sigmaAutoIncrease) {
        //as long as there are not enough neighbors in reach, increase reach (sigma)
        while (neighbours.length < k) {
            neighbours = getNeighbours(testData, ++sigmaIncreased);
        }

    }


    // Sort neighbours by distance-value
    neighbours.sort(function (n1, n2) {
        return n1[1] - n2[1];
    });

    // Remove every neighbour, which position is > k
    neighbours = neighbours.slice(0, k);


    co = getClassOccurencies();


    return {
        "neighbours": neighbours,
        "predictedClass": getClassWithHighestWeight(),
        "sigmaIncreased": (sigmaIncreased !== sigma) ? sigmaIncreased : null,
        "classOccurencyTotal": co.total,
        "classOccurencyWithinSigma": co.withinSigma,
        "classWeight": co.weight
    };


}