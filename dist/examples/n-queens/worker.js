/**
 * Simple Brute-Force-Algorithm to solve the
 * n-queens problem. It will produce distinct solutions.
 *
 */



self.addEventListener('message', function (e) {

    if (!e.data.cmd) {
        return;
    }

    switch (e.data.cmd.toLowerCase()) {
        case 'start':
            start();
            break;
        case 'stop' :
            self.close();
            break;
    }
});


var BOARDSIZE = 8;

function test(positions) {

    // No need to test row or column, as those are already excluded
    // we only need to test the diagonals

    var diagonals = [],
        current, target,
        i, j, x;

    // Get the linear equations, f(x) = m*x + b
    for (i = 0; i < positions.length; i++) {
        diagonals.push(getLinearEquationsFromPoint(i, positions[i]));
    }

    // Do the diagonals intersect?
    for (i = 0; i < diagonals.length; i++) {
        current = diagonals[i];

        for (j = 0; j < diagonals.length; j++) {

            // No need to compare to self, or something we already did
            if (j === i || i < j) continue;

            target = diagonals[j];

            // For every single field
            for (x = 0; x < BOARDSIZE; x++) {
                // Intersection --> No Solution!
                if (current[0].m * x + current[0].b === target[0].m * x + target[0].b) return false;
                else if (current[1].m * x + current[1].b === target[1].m * x + target[1].b) return false;
            }
        }

    }

    // No intersection --> Solution!
    return true;
}

function getLinearEquationsFromPoint(x, y) {
    // One is going TopLeft --> BottomRight \
    // The other BottomLeft --> TopRight /
    return [
        { m: 1, b: y - x},
        { m: -1, b: y + x}
    ];
}


function createPossibleSolution() {
    // We only need one dimension e.g. Y-coordinate,
    // as the other coordinate is the position in the array
    var fields = [],
        solution = [],
        pos;

    // Fill fields
    while (fields.length < BOARDSIZE) {
        fields.push(fields.length + 1)
    }

    // Fill the solution
    for (var i = 0; i < BOARDSIZE; ++i) {
        // Get a random element from fields
        pos = (Math.random() * fields.length) | 0;
        // Store to result array
        solution.push(fields.splice(pos, 1)[0]);
    }

    return solution;
}


function start() {

    var solution;

    while (true) {
        if (test(solution = createPossibleSolution())) {
            // Inform the listener
            self.postMessage({type: 'result:found', result: solution});

        }
    }

}

