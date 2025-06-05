class LinearProgrammingSolver {
    constructor(problem) {
        this.problem = JSON.parse(JSON.stringify(problem)); // Deep copy
        this.tableaux = [];
        this.vars = [];
        this.constraints = [];
        this.objFunction = {};
        this.basis = [];
        this.varIndex = {};
        this.tableau = [];
        this.artificials = [];
        this.phase = 1;
    }

    solve() {
        this._initialize();
        this._simplex();
        if (this.phase === 2) {
            return this._getResult();
        }

        if (this.phase === 1) {
            if (Math.abs(this.tableau[this.tableau.length - 1].slice(-1)[0]) > 1e-8) {
                throw new Error("Problème non faisable");
            }
            this._startPhase2();
            this._simplex();
            return this._getResult();
        }
    }

    _initialize() {
        const { optimize, opType, constraints, variables } = this.problem;
        const constraintKeys = Object.keys(constraints);
        const variableKeys = Object.keys(variables);
        const isMin = opType === 'min';

        // Step 1: Build column names
        this.vars = [...variableKeys];

        // Slack, surplus and artificial
        constraintKeys.forEach((ck, i) => {
            const bound = constraints[ck];
            const type = Object.keys(bound)[0];
            if (type === 'max') {
                this.vars.push(`s${i + 1}`);
            } else if (type === 'min') {
                this.vars.push(`e${i + 1}`);
                this.vars.push(`a${i + 1}`);
                this.artificials.push(`a${i + 1}`);
            } else if (type === 'equal') {
                this.vars.push(`a${i + 1}`);
                this.artificials.push(`a${i + 1}`);
            }
        });

        this.vars.push('RHS');

        // Step 2: Build tableau
        let tableau = [];
        this.basis = [];
        constraintKeys.forEach((ck, i) => {
            let row = Array(this.vars.length).fill(0);
            const constraint = constraints[ck];
            const bound = constraint[Object.keys(constraint)[0]];
            variableKeys.forEach((vk, j) => {
                row[this.vars.indexOf(vk)] = variables[vk][ck] || 0;
            });

            const type = Object.keys(constraint)[0];
            if (type === 'max') {
                row[this.vars.indexOf(`s${i + 1}`)] = 1;
                this.basis.push(`s${i + 1}`);
            } else if (type === 'min') {
                row[this.vars.indexOf(`e${i + 1}`)] = -1;
                row[this.vars.indexOf(`a${i + 1}`)] = 1;
                this.basis.push(`a${i + 1}`);
            } else if (type === 'equal') {
                row[this.vars.indexOf(`a${i + 1}`)] = 1;
                this.basis.push(`a${i + 1}`);
            }

            row[this.vars.length - 1] = bound;
            tableau.push(row);
        });

        // Phase 1: Minimize sum of artificials
        let objRow = Array(this.vars.length).fill(0);
        this.artificials.forEach((a) => {
            objRow[this.vars.indexOf(a)] = 1;
        });
        objRow[this.vars.length - 1] = 0;

        // Fix phase 1 obj row (subtract each artificial row)
        this.artificials.forEach((a) => {
            const rowIdx = this.basis.indexOf(a);
            if (rowIdx !== -1) {
                tableau[tableau.length] = objRow.map((val, i) => val - tableau[rowIdx][i]);
                objRow = tableau.pop();
            }
        });

        tableau.push(objRow);
        this.tableau = tableau;
        this.tableaux.push(this._formatTableau());
    }

    _startPhase2() {
        this.phase = 2;

        // Remove artificial columns
        const artiIndexes = this.artificials.map(a => this.vars.indexOf(a));
        this.vars = this.vars.filter(v => !this.artificials.includes(v));
        this.tableau = this.tableau.map(row => row.filter((_, i) => !artiIndexes.includes(i)));

        // Recalculate objective row
        const { optimize, opType, variables } = this.problem;
        let objRow = Array(this.vars.length).fill(0);
        const isMin = opType === 'min';
        const sign = isMin ? 1 : -1;

        this.vars.forEach((v, i) => {
            if (v === 'RHS') return;
            objRow[i] = sign * (variables[v]?.[optimize] || 0);
        });

        // Fix for basic vars
        this.basis.forEach((bv, i) => {
            const coeff = variables[bv]?.[optimize] || 0;
            this.tableau[i].forEach((val, j) => {
                objRow[j] -= coeff * val;
            });
        });

        this.tableau[this.tableau.length - 1] = objRow;
        this.tableaux.push(this._formatTableau());
    }

    _simplex() {
        let maxIter = 50;
        while (maxIter-- > 0) {
            const objRow = this.tableau[this.tableau.length - 1];
            const pivotCol = this._pivotColumn(objRow);
            if (pivotCol === -1) break;

            const pivotRow = this._pivotRow(pivotCol);
            if (pivotRow === -1) throw new Error("Problème non borné");

            this._pivot(pivotRow, pivotCol);
            this.tableaux.push(this._formatTableau());
        }
    }

    _pivotColumn(row) {
        const last = row.length - 1;
        let idx = -1, min = 0;
        for (let i = 0; i < last; i++) {
            if (row[i] < min) {
                min = row[i];
                idx = i;
            }
        }
        return idx;
    }

    _pivotRow(pivotCol) {
        let ratios = this.tableau
            .slice(0, -1)
            .map((row, i) => {
                const val = row[pivotCol];
                const rhs = row[row.length - 1];
                return val > 0 ? rhs / val : Infinity;
            });
        let min = Math.min(...ratios);
        if (min === Infinity) return -1;
        return ratios.indexOf(min);
    }

    _pivot(pivotRow, pivotCol) {
        const val = this.tableau[pivotRow][pivotCol];
        this.tableau[pivotRow] = this.tableau[pivotRow].map(v => v / val);

        for (let i = 0; i < this.tableau.length; i++) {
            if (i !== pivotRow) {
                const coeff = this.tableau[i][pivotCol];
                for (let j = 0; j < this.tableau[i].length; j++) {
                    this.tableau[i][j] -= coeff * this.tableau[pivotRow][j];
                }
            }
        }

        this.basis[pivotRow] = this.vars[pivotCol];
    }

    _formatTableau() {
        return {
            headers: this.vars,
            basis: [...this.basis],
            rows: this.tableau.map(row => [...row])
        };
    }

    _getResult() {
        const varValues = {};
        this.vars.forEach(v => {
            if (v === 'RHS') return;
            const idx = this.basis.indexOf(v);
            varValues[v] = idx >= 0 ? this.tableau[idx][this.tableau[0].length - 1] : 0;
        });
        const z = this.tableau[this.tableau.length - 1][this.tableau[0].length - 1];
        return {
            p: Math.round(z * 1000) / 1000,
            variables: varValues,
            tableaux: this.tableaux
        };
    }
}


// AJOUTER DES PROBLEMES 
const problemeMax1 = {
    optimize: 'objectif',
    opType: 'max',
    constraints: {
        hello: { max: 8 },
        hola: { max: 8 }
    },
    variables: {
        x: { objectif: 4, hello: 2, hola: 3 },
        y: { objectif: 3, hello: 1, hola: 2 },
        z: { objectif: 2, hello: 2, hola: 1 }
    }
};

const problemeMin2 = {
    optimize: 'objectif',
    opType: 'min',
    constraints: {
        c1: { min: 4 },
        c2: { min: 5 }
    },
    variables: {
        x: { objectif: 3, c1: 1, c2: 2 },
        y: { objectif: 2, c1: 1, c2: 1 }
    }
};

const problemeMinTest = {
    optimize: 'objectif',
    opType: 'min',
    constraints: {
        c1: { max: 40 },       // x + y + z + w <= 40
        c2: { min: 10 },       // 2x + y - z - w >= 10
        c3: { min: 12 }        // w - y >= 12
    },
    variables: {
        x: { objectif: 2, c1: 1, c2: 2, c3: 0 },
        y: { objectif: 3, c1: 1, c2: 1, c3: -1 },
        z: { objectif: 1, c1: 1, c2: -1, c3: 0 },
        w: { objectif: 1, c1: 1, c2: -1, c3: 1 }
    }
};

const problemeMinTest2 = {
    optimize: 'objectif',
    opType: 'min',
    constraints: {
        c1: { max: 40 },   // x + 2y <= 40
        c2: { min: 30 },   // 3x + y >= 30
        c3: { min: 60 }    // 4x + 3y >= 60
    },
    variables: {
        x: { objectif: 20, c1: 1, c2: 3, c3: 4 },
        y: { objectif: 10, c1: 2, c2: 1, c3: 3 }
    }
};

// PASSER EN PARAMETRE LE PROBLEME LinearProgrammingSolver(nom du probleme) console.log(problemeMinTest)
const solver = new LinearProgrammingSolver(problemeMinTest);
const result = solver.solve();
console.log("Optimal value:", result.p);
console.log(result.tableaux)

let resOptiVal = result.p < 0 ? (result.p * -1) : result.p
console.log("Optimal solution: p =", resOptiVal);
console.log("Variable values:", result.variables);
result.tableaux.forEach((tab, i) => {
    console.log(`\nTableau ${i + 1}:`);
    console.log(tab.headers.join("\t"));
    tab.rows.forEach((row, r) => {
        const label = r < tab.basis.length ? "*" + tab.basis[r] : "-p";
        console.log(label + "\t" + row.map(n => Math.round(n * 1000) / 1000).join("\t"));
    });
});
