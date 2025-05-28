const objectiveFunctionInput = document.getElementById('objective-function');
const constraintsContainer = document.getElementById('constraints-container');
const solveButton = document.getElementById('solve-button');
const outputSection = document.getElementById('output-section');
const solutionText = document.getElementById('solution-text');
const graphSection = document.getElementById('graph-section');
const graphCanvas = document.getElementById('graph-canvas');
const sensitivitySection = document.getElementById('sensitivity-section');
const sensitivityText = document.getElementById('sensitivity-text');
const tableauxSection = document.getElementById('tableaux-section');

let chartInstance = null;
let currentResult = null;


solveButton.addEventListener('click', () => {
    try {
        const objectiveFunction = objectiveFunctionInput.value;
        const optimizationType = document.getElementById('optimization-type').value;
        const constraints = [];
        const constraintGroups = constraintsContainer.querySelectorAll('.constraint-group');
        constraintGroups.forEach(group => {
            const nameInput = group.querySelector('.constraint-name');
            const expressionInput = group.querySelector('.constraint-expression');
            const operatorSelect = group.querySelector('.constraint-operator');
            const valueInput = group.querySelector('.constraint-value');
            constraints.push({
                name: nameInput.value,
                expression: expressionInput.value,
                operator: operatorSelect.value,
                value: parseFloat(valueInput.value)
            });
        });

        const problem = parseProblem(objectiveFunction, constraints, optimizationType);

        if (!objectiveFunction) {
            throw new Error("Veuillez entrer une fonction objective.");
        }
        if (constraints.length === 0) {
            throw new Error("Veuillez entrer au moins une contrainte.");
        }

        console.log(problem)
        const solver = new LinearProgrammingSolver(problem);
        const result = solver.solve();
        console.log(result)

        // Stocker le résultat dans la variable globale
        currentResult = result;

        displaySolution(result, problem);
        displayTableaux(result.tableaux);
        plotSolution(problem, result);
        displaySensitivityAnalysis(result, constraints);

        outputSection.classList.remove('hidden');
        tableauxSection.classList.remove('hidden');
        graphSection.classList.remove('hidden');
        sensitivitySection.classList.remove('hidden');

    } catch (error) {
        alert("Erreur : " + error.message);
    }
});



function addConstraintGroup() {
    const constraintGroup = document.createElement('div');
    constraintGroup.className = 'constraint-group flex items-center space-x-3 mb-3';
    constraintGroup.innerHTML = `
        <input type="text" placeholder="Nom de la contrainte"
            class="constraint-name flex-1 border border-gray-300 rounded-lg py-2 px-3 text-gray-800" />
        <input type="text" placeholder="2x + y"
            class="constraint-expression flex-1 border border-gray-300 rounded-lg py-2 px-3 text-gray-800" />
        <select class="constraint-operator border border-gray-300 rounded-lg py-2 px-3 text-gray-800 w-16">
            <option value="<=">≤</option>
            <option value=">=">≥</option>
            <option value="=">=</option>
        </select>
        <input type="text" placeholder="10"
            class="constraint-value w-20 border border-gray-300 rounded-lg py-2 px-3 text-gray-800" />
        <button class="remove-constraint bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-2 transition" type="button">
            <i class="ph-bold ph-trash"></i>
        </button>
    `;

    // Déplacer le bouton "Ajouter une contrainte" après la nouvelle contrainte
    // On suppose que le bouton a la classe "add-constraint"
    const addBtn = constraintsContainer.querySelector('.add-constraint');
    if (addBtn) {
        constraintsContainer.insertBefore(constraintGroup, addBtn);
    } else {
        constraintsContainer.appendChild(constraintGroup);
    }

    const removeButton = constraintGroup.querySelector('.remove-constraint');
    removeButton.addEventListener('click', () => {
        constraintGroup.remove();
        // Remettre le bouton "Ajouter une contrainte" à la fin si plus de contraintes
        const addBtn = constraintsContainer.querySelector('.add-constraint');
        if (addBtn) {
            constraintsContainer.appendChild(addBtn);
        }
    });
}



constraintsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('add-constraint')) {
        addConstraintGroup();
    }
});

function parseProblem(objectiveFunction, constraints, optimizationType) {
    const objectiveName = document.getElementById('objective-name').value || 'objectif';
    const problem = {
        optimize: objectiveName,
        opType: optimizationType,
        constraints: {},
        variables: {}
    };

    // Analyser la fonction objective
    const objectiveParts = objectiveFunction.split(/([+-]?\d*[a-zA-Z]+)/).filter(Boolean);
    objectiveParts.forEach(part => {
        const match = part.match(/([+-]?\d*)([a-zA-Z]+)/);
        if (match) {
            const coeff = match[1] === '-' ? -1 : match[1] === '+' ? 1 : parseFloat(match[1] || 1);
            const varName = match[2];
            problem.variables[varName] = { [objectiveName]: coeff };
        }
    });

    // Analyser les contraintes
    constraints.forEach((constraint, index) => {
        const constraintName = constraint.name || `c${index + 1}`;
        const parts = constraint.expression.split(/([+-]?\d*[a-zA-Z]+)/).filter(Boolean);
        const constraintObj = {};

        parts.forEach(part => {
            const match = part.match(/([+-]?\d*)([a-zA-Z]+)/);
            if (match) {
                const coeff = match[1] === '-' ? -1 : match[1] === '+' ? 1 : parseFloat(match[1] || 1);
                const varName = match[2];
                if (problem.variables[varName]) {
                    problem.variables[varName][constraintName] = coeff;
                } else {
                    problem.variables[varName] = { [constraintName]: coeff };
                }
            }
        });

        if (constraint.operator === '<=') {
            constraintObj.max = parseFloat(constraint.value);
        } else if (constraint.operator === '>=') {
            constraintObj.min = parseFloat(constraint.value);
        } else if (constraint.operator === '=') {
            constraintObj.equal = parseFloat(constraint.value);
        }

        problem.constraints[constraintName] = constraintObj;
    });

    return problem;
}


// function displaySolution(result, problem) {
//     let solutionTextString = "<div class='solution-container'>";
//     solutionTextString += "<h3 class='text-xl font-semibold text-indigo-700 mb-2'>Solution Optimale</h3>";
//     solutionTextString += `<p class='mb-2'>La solution optimale de la fonction objective ${problem.optimize} est atteinte pour :</p>`;
//     solutionTextString += "<ul class='list-disc list-inside mb-4'>";
//     for (const [variable, value] of Object.entries(result.variables)) {
//         solutionTextString += `<li>${variable} = ${value}</li>`;
//     }
//     solutionTextString += "</ul>";
//     solutionTextString += `<p class='font-bold'>Valeur de la fonction objective ${problem.optimize} : ${result.p.toFixed(2)}</p>`;
//     solutionTextString += "</div>";
//     solutionText.innerHTML = solutionTextString;
// }


function displaySolution(result, problem) {
    let solutionTextString = "<div class='solution-container'>";
    solutionTextString += "<h3 class='text-xl font-semibold text-indigo-700 mb-2'>Solution Optimale</h3>";
    solutionTextString += `<p class='mb-2'>La solution optimale de la fonction objective ${problem.optimize} est atteinte pour :</p>`;
    solutionTextString += "<ul class='list-disc list-inside mb-4'>";
    for (const [variable, value] of Object.entries(result.variables)) {
        solutionTextString += `<li>${variable} = ${value}</li>`;
    }
    solutionTextString += "</ul>";
    solutionTextString += `<p class='font-bold'>Valeur de la fonction objective ${problem.optimize} : ${result.p.toFixed(2)}</p>`;
    solutionTextString += "</div>";
    solutionText.innerHTML = solutionTextString;
}



function displayTableaux(tableaux) {
    const tableauxResultsDiv = document.getElementById('tableauxResults');
    tableauxResultsDiv.innerHTML = '';

    tableaux.forEach((tab, i) => {
        const tableauContainer = document.createElement('div');
        tableauContainer.classList.add('tableau-container');
        tableauContainer.innerHTML = `<h3 class="text-lg font-semibold text-indigo-700 mb-2">Tableau ${i + 1}:</h3>`;

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Headers
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `<th>Basis</th>` + tab.headers.map(header => `<th>${header}</th>`).join('');
        thead.appendChild(headerRow);

        // Trouver colonne pivot (plus négatif dans ligne obj)
        const objRow = tab.rows[tab.rows.length - 1];
        const pivotCol = objRow.slice(0, -1).reduce((minIdx, val, idx, arr) => val < arr[minIdx] ? idx : minIdx, 0);
        const isUnbounded = objRow[pivotCol] >= 0;
        let pivotRow = -1;

        if (!isUnbounded) {
            const ratios = tab.rows.slice(0, -1).map((row, i) => {
                const rhs = row[row.length - 1];
                const val = row[pivotCol];
                return val > 0 ? rhs / val : Infinity;
            });
            const minRatio = Math.min(...ratios);
            pivotRow = ratios.indexOf(minRatio);
        }

        // Rows
        tab.rows.forEach((row, rIdx) => {
            const tr = document.createElement('tr');
            const label = rIdx < tab.basis.length ? "*" + tab.basis[rIdx] : "Z";

            tr.innerHTML = `<td>${label}</td>` + row.map((val, cIdx) => {
                let cellClass = '';
                if (rIdx === pivotRow && cIdx === pivotCol) cellClass = 'pivot-cell';
                else if (rIdx === pivotRow) cellClass = 'pivot-row';
                else if (cIdx === pivotCol) cellClass = 'pivot-col';

                return `<td class="${cellClass}">${(Math.round(val * 1000) / 1000).toFixed(3)}</td>`;
            }).join('');

            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        tableauContainer.appendChild(table);
        tableauxResultsDiv.appendChild(tableauContainer);
    });
}

function plotSolution(problem, result) {
    const plotDiv = document.getElementById('plot');
    const variables = Object.keys(problem.variables);

    if (variables.length === 2) {
        plot2D(problem, result, plotDiv);
    } else if (variables.length === 3) {
        plot3D(problem, result, plotDiv);
    } else {
        plotDiv.innerHTML = '<p>Graph visualization is available for problems with 2 or 3 variables.</p>';
        Plotly.newPlot(plotDiv, [], {}); // Clear any previous plot
    }
}

function plot2D(problem, result, plotDiv) {
    const data = [];

    const xVar = Object.keys(problem.variables)[0];
    const yVar = Object.keys(problem.variables)[1];

    const constraints = problem.constraints;
    const variables = problem.variables;

    // Déterminer maxX et maxY pour la zone de tracé
    let maxX = 0;
    let maxY = 0;
    for (const conKey in constraints) {
        const conType = Object.keys(constraints[conKey])[0];
        const rhs = constraints[conKey][conType];
        const xCoeff = variables[xVar]?.[conKey] || 0;
        const yCoeff = variables[yVar]?.[conKey] || 0;

        if (xCoeff !== 0) maxX = Math.max(maxX, rhs / xCoeff);
        if (yCoeff !== 0) maxY = Math.max(maxY, rhs / yCoeff);
    }

    maxX = Math.max(maxX, result.variables[xVar] || 0) * 1.5 + 5;
    maxY = Math.max(maxY, result.variables[yVar] || 0) * 1.5 + 5;

    // Définir le layout maintenant que maxX et maxY sont disponibles
    const layout = {
        title: 'Feasible Region and Objective Function (2D)',
        xaxis: {
            title: xVar,
            range: [0, maxX],
            zeroline: true
        },
        yaxis: {
            title: yVar,
            range: [0, maxY],
            zeroline: true
        },
        hovermode: 'closest',
        showlegend: true
    };

    // Contraintes de non-négativité
    data.push({
        x: [0, maxX], y: [0, 0], mode: 'lines', name: `${xVar} ≥ 0`, line: { dash: 'dot', color: 'gray' }
    });
    data.push({
        x: [0, 0], y: [0, maxY], mode: 'lines', name: `${yVar} ≥ 0`, line: { dash: 'dot', color: 'gray' }
    });

    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    let colorIndex = 0;

    // Tracer les contraintes
    for (const conKey in constraints) {
        const conType = Object.keys(constraints[conKey])[0];
        const rhs = constraints[conKey][conType];
        const xCoeff = variables[xVar]?.[conKey] || 0;
        const yCoeff = variables[yVar]?.[conKey] || 0;

        if (xCoeff === 0 && yCoeff === 0) continue;

        let x_vals = [];
        let y_vals = [];

        if (yCoeff !== 0) {
            x_vals = Array.from({ length: 100 }, (_, i) => i * (maxX / 99));
            y_vals = x_vals.map(x => (rhs - xCoeff * x) / yCoeff);
        } else if (xCoeff !== 0) {
            const xVal = rhs / xCoeff;
            x_vals = [xVal, xVal];
            y_vals = [0, maxY];
        }

        data.push({
            x: x_vals,
            y: y_vals,
            mode: 'lines',
            name: `${conKey} (${conType} ${rhs})`,
            line: { width: 2, color: colors[colorIndex % colors.length] }
        });

        colorIndex++;
    }

    // Point optimal
    const optimalX = result.variables[xVar] || 0;
    const optimalY = result.variables[yVar] || 0;
    data.push({
        x: [optimalX],
        y: [optimalY],
        mode: 'markers',
        type: 'scatter',
        name: `Optimal Solution (p = ${result.p})`,
        marker: { size: 12, color: 'red', symbol: 'star' }
    });

    Plotly.newPlot(plotDiv, data, layout);
}


function plot3D(problem, result, plotDiv) {
    const data = [];
    const layout = {
        title: 'Feasible Region and Objective Function (3D)',
        showlegend: true,
        scene: {
            xaxis: { title: Object.keys(problem.variables)[0] },
            yaxis: { title: Object.keys(problem.variables)[1] },
            zaxis: { title: Object.keys(problem.variables)[2] }
        },
        legend: {
            x: 1,
            y: 1
        }
    };

    const xVar = Object.keys(problem.variables)[0];
    const yVar = Object.keys(problem.variables)[1];
    const zVar = Object.keys(problem.variables)[2];

    const constraints = problem.constraints;
    const variables = problem.variables;

    let maxX = 0, maxY = 0, maxZ = 0;
    for (const conKey in constraints) {
        const conType = Object.keys(constraints[conKey])[0];
        const rhs = constraints[conKey][conType];
        const xCoeff = variables[xVar]?.[conKey] || 0;
        const yCoeff = variables[yVar]?.[conKey] || 0;
        const zCoeff = variables[zVar]?.[conKey] || 0;

        if (xCoeff !== 0) maxX = Math.max(maxX, rhs / xCoeff);
        if (yCoeff !== 0) maxY = Math.max(maxY, rhs / yCoeff);
        if (zCoeff !== 0) maxZ = Math.max(maxZ, rhs / zCoeff);
    }
    maxX = Math.max(maxX, result.variables[xVar] || 0) * 1.5 + 5;
    maxY = Math.max(maxY, result.variables[yVar] || 0) * 1.5 + 5;
    maxZ = Math.max(maxZ, result.variables[zVar] || 0) * 1.5 + 5;

    const numPoints = 20;
    const x_range = Array.from({ length: numPoints }, (_, i) => i * (maxX / (numPoints - 1)));
    const y_range = Array.from({ length: numPoints }, (_, i) => i * (maxY / (numPoints - 1)));

    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    let colorIndex = 0;

    for (const conKey in constraints) {
        const conType = Object.keys(constraints[conKey])[0];
        const rhs = constraints[conKey][conType];
        const xCoeff = variables[xVar]?.[conKey] || 0;
        const yCoeff = variables[yVar]?.[conKey] || 0;
        const zCoeff = variables[zVar]?.[conKey] || 0;

        if (xCoeff === 0 && yCoeff === 0 && zCoeff === 0) continue;

        const z_vals = [];
        for (let i = 0; i < numPoints; i++) {
            const row = [];
            for (let j = 0; j < numPoints; j++) {
                let z_val;
                if (zCoeff !== 0) {
                    z_val = (rhs - xCoeff * x_range[i] - yCoeff * y_range[j]) / zCoeff;
                } else if (yCoeff !== 0) {
                    z_val = (rhs - xCoeff * x_range[i]) / yCoeff;
                } else if (xCoeff !== 0) {
                    z_val = rhs / xCoeff;
                } else {
                    z_val = 0;
                }
                row.push(z_val);
            }
            z_vals.push(row);
        }

        const color = colors[colorIndex % colors.length];
        const constraintName = `${conKey} (${conType} ${rhs})`;

        // Trace surface
        data.push({
            x: x_range,
            y: y_range,
            z: z_vals,
            type: 'surface',
            showscale: false,
            name: constraintName,
            opacity: 0.5,
            hoverinfo: 'name',
            colorscale: [[0, color], [1, color]],
            legendgroup: constraintName,
            showlegend: false
        });

        // Fake trace for legend
        data.push({
            type: 'scatter3d',
            mode: 'lines',
            x: [null], y: [null], z: [null],
            name: constraintName,
            legendgroup: constraintName,
            line: { color: color },
            showlegend: true
        });

        colorIndex++;
    }

    // Optimal solution point
    const optimalX = result.variables[xVar] || 0;
    const optimalY = result.variables[yVar] || 0;
    const optimalZ = result.variables[zVar] || 0;

    data.push({
        x: [optimalX],
        y: [optimalY],
        z: [optimalZ],
        mode: 'markers',
        type: 'scatter3d',
        name: `Optimal Solution (p=${result.p})`,
        marker: { size: 8, color: 'red', symbol: 'circle' },
        showlegend: true
    });

    Plotly.newPlot(plotDiv, data, layout);
}



function displaySensitivityAnalysis(result, constraints) {
    if (!result.tableaux || result.tableaux.length === 0) {
        sensitivityText.innerHTML = "L'analyse de sensibilité n'est pas disponible pour ce problème.";
        return;
    }

    const lastTableau = result.tableaux[result.tableaux.length - 1];
    const headers = lastTableau.headers;
    const basis = lastTableau.basis;
    const rows = lastTableau.rows;
    const objRow = rows[rows.length - 1];

    let sensitivityHtml = `<form id="sensitivity-form" onsubmit="return false;"><table class="min-w-full text-sm"><thead><tr>
        <th>Contrainte</th>
        <th>Prix dual</th>
        <th>Valeur RHS</th>
        <th>Tester une nouvelle valeur</th>
    </tr></thead><tbody>`;

    constraints.forEach((constraint, idx) => {
        const constraintName = constraint.name || `c${idx + 1}`;
        const slackIdx = headers.indexOf(constraintName);
        let shadowPrice = 0;
        if (slackIdx !== -1) {
            shadowPrice = -objRow[slackIdx];
        }
        let rhsValue = 0;
        const basisIdx = basis.indexOf(constraintName);
        if (basisIdx !== -1) {
            rhsValue = rows[basisIdx][rows[basisIdx].length - 1];
        }
        sensitivityHtml += `<tr>
            <td>${constraintName}</td>
            <td>${shadowPrice.toFixed(4)}</td>
            <td>${rhsValue.toFixed(4)}</td>
            <td>
                <input type="number" step="any" name="rhs_${idx}" value="${constraint.value}" style="width:80px" />
                <button type="button" class="test-sensitivity-btn" data-idx="${idx}">Tester</button>
            </td>
        </tr>`;
    });

    sensitivityHtml += "</tbody></table></form>";
    sensitivityText.innerHTML = sensitivityHtml;

    // Empêcher le submit du formulaire (sécurité supplémentaire)
    const form = document.getElementById('sensitivity-form');
    if (form) {
        form.addEventListener('submit', function(e) { e.preventDefault(); });
    }

    // Correction : Utiliser addEventListener au lieu de .onclick pour éviter les conflits
    document.querySelectorAll('.test-sensitivity-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const idx = parseInt(this.getAttribute('data-idx'));
            const form = document.getElementById('sensitivity-form');
            const newConstraints = constraints.map((c, i) => ({
                ...c,
                value: parseFloat(form.elements[`rhs_${i}`].value)
            }));
            const objectiveFunction = objectiveFunctionInput.value;
            const optimizationType = document.getElementById('optimization-type').value;
            const problem = parseProblem(objectiveFunction, newConstraints, optimizationType);
            let newResult;
            try {
                const solver = new LinearProgrammingSolver(problem);
                newResult = solver.solve();
            } catch (e) {
                sensitivityText.innerHTML += `<div style="color:red;">Problème non réalisable ou erreur de résolution.</div>`;
                return;
            }
            displaySolution(newResult, problem);
            displayTableaux(newResult.tableaux);
            plotSolution(problem, newResult);
            displaySensitivityAnalysis(newResult, newConstraints);
        });
    });
}



// Pour la sauvegardes : 

// Fonction pour sauvegarder le problème actuel dans le local storage
document.getElementById('save-button').addEventListener('click', () => {
    const objectiveFunction = objectiveFunctionInput.value;
    const optimizationType = document.getElementById('optimization-type').value;
    const objectiveName = document.getElementById('objective-name').value;
    const constraints = [];

    const constraintGroups = constraintsContainer.querySelectorAll('.constraint-group');
    constraintGroups.forEach(group => {
        const nameInput = group.querySelector('.constraint-name');
        const expressionInput = group.querySelector('.constraint-expression');
        const operatorSelect = group.querySelector('.constraint-operator');
        const valueInput = group.querySelector('.constraint-value');
        constraints.push({
            name: nameInput.value,
            expression: expressionInput.value,
            operator: operatorSelect.value,
            value: parseFloat(valueInput.value)
        });
    });

    if (!currentResult) {
        alert("Aucun résultat à sauvegarder. Résolvez d'abord le problème.");
        return;
    }

    const problem = {
        objectiveName,
        objectiveFunction,
        optimizationType,
        constraints,
        solution: {
            variables: currentResult.variables,
            p: currentResult.p
        }
    };

    let savedProblems = JSON.parse(localStorage.getItem('savedProblems')) || [];
    savedProblems.push(problem);
    localStorage.setItem('savedProblems', JSON.stringify(savedProblems));

    alert("Problème sauvegardé avec succès !");
    displaySavedProblems();
});
;

// Fonction pour afficher la liste des problèmes sauvegardés
function displaySavedProblems() {
    const savedProblemsList = document.getElementById('saved-problems-list');
    savedProblemsList.innerHTML = '';

    const savedProblems = JSON.parse(localStorage.getItem('savedProblems')) || [];
    savedProblems.forEach((problem, index) => {
        const problemDiv = document.createElement('div');
        problemDiv.className = 'border border-gray-300 rounded-lg p-3 mb-2';
        problemDiv.innerHTML = `
            <h3 class="font-semibold text-indigo-700">${problem.objectiveName}</h3>
            <p class="text-gray-700">${problem.objectiveFunction}</p>
            <p class="text-gray-600">${problem.optimizationType === 'max' ? 'Maximisation' : 'Minimisation'}</p>
            <div class="flex space-x-2 mt-2">
                <button class="load-problem bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-3 py-1 transition" data-index="${index}">
                    <i class="ph-bold ph-arrow-clockwise mr-1"></i>
                </button>
                <button class="delete-problem bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1 transition" data-index="${index}">
                    <i class="ph-bold ph-trash mr-1"></i>
                </button>
            </div>
        `;
        savedProblemsList.appendChild(problemDiv);
    });

    // Ajouter des écouteurs d'événements aux boutons de chargement et de suppression
    document.querySelectorAll('.load-problem').forEach(button => {
        button.addEventListener('click', (event) => {
            const index = event.target.getAttribute('data-index');
            loadProblem(index);
        });
    });

    document.querySelectorAll('.delete-problem').forEach(button => {
        button.addEventListener('click', (event) => {
            const index = event.target.getAttribute('data-index');
            deleteProblem(index);
        });
    });
}

function deleteProblem(index) {
    let savedProblems = JSON.parse(localStorage.getItem('savedProblems')) || [];
    savedProblems.splice(index, 1);
    localStorage.setItem('savedProblems', JSON.stringify(savedProblems));
    displaySavedProblems();
    alert("Problème supprimé avec succès !");
}


// Fonction pour charger un problème sauvegardé
function loadProblem(index) {
    const savedProblems = JSON.parse(localStorage.getItem('savedProblems')) || [];
    const problem = savedProblems[index];

    // Remplir les champs avec les valeurs du problème sauvegardé
    document.getElementById('objective-name').value = problem.objectiveName;
    objectiveFunctionInput.value = problem.objectiveFunction;
    document.getElementById('optimization-type').value = problem.optimizationType;

    // Effacer les contraintes actuelles
    constraintsContainer.innerHTML = '';

    // Ajouter les contraintes sauvegardées
    problem.constraints.forEach(constraint => {
        addConstraintGroup();
        const constraintGroups = constraintsContainer.querySelectorAll('.constraint-group');
        const lastGroup = constraintGroups[constraintGroups.length - 1];
        lastGroup.querySelector('.constraint-name').value = constraint.name;
        lastGroup.querySelector('.constraint-expression').value = constraint.expression;
        lastGroup.querySelector('.constraint-operator').value = constraint.operator;
        lastGroup.querySelector('.constraint-value').value = constraint.value;
    });

    // Afficher la solution
    displaySolution(problem.solution, parseProblem(problem.objectiveFunction, problem.constraints, problem.optimizationType));
    outputSection.classList.remove('hidden');
}

// Charger la liste des problèmes sauvegardés au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    displaySavedProblems();
});





