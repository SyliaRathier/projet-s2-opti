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

solveButton.addEventListener('click', () => {
    try {
        const objectiveFunction = objectiveFunctionInput.value;
        const optimizationType = document.getElementById('optimization-type').value;
        const constraints = [];
        const constraintGroups = constraintsContainer.querySelectorAll('.constraint-group');
        constraintGroups.forEach(group => {
            const expressionInput = group.querySelector('.constraint-expression');
            const operatorSelect = group.querySelector('.constraint-operator');
            const valueInput = group.querySelector('.constraint-value');
            constraints.push({
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

        const solver = new LinearProgrammingSolver(problem);
        const result = solver.solve();

        displaySolution(result);
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
    constraintGroup.className = 'constraint-group flex flex-wrap gap-2 mb-2';
    constraintGroup.innerHTML = `
                <input type="text" placeholder="2x + y" class="constraint-expression flex-grow border border-gray-300 rounded-lg py-2 px-3 text-gray-800">
                <select class="constraint-operator border border-gray-300 rounded-lg py-2 px-3 text-gray-800">
                    <option value="<=">≤</option>
                    <option value=">=">≥</option>
                    <option value="=">=</option>
                </select>
                <input type="text" placeholder="10" class="constraint-value flex-grow border border-gray-300 rounded-lg py-2 px-3 text-gray-800">
                <button class="remove-constraint bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-2 transition" type="button">
                    <i class="ph-bold ph-trash"></i>
                </button>
            `;
    constraintsContainer.appendChild(constraintGroup);

    const removeButton = constraintGroup.querySelector('.remove-constraint');
    removeButton.addEventListener('click', () => {
        constraintGroup.remove();
    });
}

constraintsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('add-constraint')) {
        addConstraintGroup();
    }
});

function parseProblem(objectiveFunction, constraints, optimizationType) {
    const problem = {
        optimize: 'objectif',
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
            problem.variables[varName] = { objectif: coeff };
        }
    });

    // Analyser les contraintes
    constraints.forEach((constraint, index) => {
        const constraintName = `c${index + 1}`;
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

function displaySolution(result) {
    let solutionTextString = "<div class='solution-container'>";
    solutionTextString += "<h3 class='text-xl font-semibold text-indigo-700 mb-2'>Solution Optimale</h3>";
    solutionTextString += "<p class='mb-2'>La solution optimale est atteinte pour :</p>";
    solutionTextString += "<ul class='list-disc list-inside mb-4'>";
    for (const [variable, value] of Object.entries(result.variables)) {
        solutionTextString += `<li>${variable} = ${value}</li>`;
    }
    solutionTextString += "</ul>";
    solutionTextString += `<p class='font-bold'>Valeur de la fonction objective : ${result.p.toFixed(2)}</p>`;
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

        // Rows
        tab.rows.forEach((row, rIdx) => {
            const tr = document.createElement('tr');
            const label = rIdx < tab.basis.length ? tab.basis[rIdx] : "Z"; // 'Z' for the objective row
            tr.innerHTML = `<td>${label}</td>` + row.map(n => `<td>${(Math.round(n * 1000) / 1000).toFixed(3)}</td>`).join('');
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
    const layout = {
        title: 'Feasible Region and Objective Function (2D)',
        xaxis: { title: Object.keys(problem.variables)[0] },
        yaxis: { title: Object.keys(problem.variables)[1] },
        hovermode: 'closest',
        showlegend: true
    };

    const xVar = Object.keys(problem.variables)[0];
    const yVar = Object.keys(problem.variables)[1];

    const x_values = [];
    const y_values = [];

    // Plot constraints
    const constraints = problem.constraints;
    const variables = problem.variables;

    // Determine plot range
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

    // Add non-negativity constraints for plotting convenience
    data.push({
        x: [0, maxX], y: [0, 0], mode: 'lines', name: `${xVar} >= 0`, line: { dash: 'dot', color: 'gray' }
    });
    data.push({
        x: [0, 0], y: [0, maxY], mode: 'lines', name: `${yVar} >= 0`, line: { dash: 'dot', color: 'gray' }
    });

    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    let colorIndex = 0;

    for (const conKey in constraints) {
        const conType = Object.keys(constraints[conKey])[0];
        const rhs = constraints[conKey][conType];
        const xCoeff = variables[xVar]?.[conKey] || 0;
        const yCoeff = variables[yVar]?.[conKey] || 0;

        if (xCoeff === 0 && yCoeff === 0) continue; // Trivial constraint, ignore for plotting

        let x_vals = [];
        let y_vals = [];

        if (yCoeff !== 0) { // y = (rhs - xCoeff * x) / yCoeff
            x_vals = Array.from({ length: 100 }, (_, i) => i * (maxX / 99));
            y_vals = x_vals.map(x => (rhs - xCoeff * x) / yCoeff);
        } else if (xCoeff !== 0) { // x = rhs / xCoeff (vertical line)
            x_vals = [rhs / xCoeff, rhs / xCoeff];
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

    // Plot the optimal solution point
    const optimalX = result.variables[xVar] || 0;
    const optimalY = result.variables[yVar] || 0;
    data.push({
        x: [optimalX],
        y: [optimalY],
        mode: 'markers',
        type: 'scatter',
        name: `Optimal Solution (p=${result.p})`,
        marker: { size: 12, color: 'red', symbol: 'star' }
    });

    Plotly.newPlot(plotDiv, data, layout);
}

function plot3D(problem, result, plotDiv) {
    const data = [];
    const layout = {
        title: 'Feasible Region and Objective Function (3D)',
        scene: {
            xaxis: { title: Object.keys(problem.variables)[0] },
            yaxis: { title: Object.keys(problem.variables)[1] },
            zaxis: { title: Object.keys(problem.variables)[2] }
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

    // Generate meshgrid for surfaces
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
                    z_val = (rhs - xCoeff * x_range[i]) / yCoeff; // This becomes constant for z
                } else if (xCoeff !== 0) {
                    z_val = rhs / xCoeff; // This becomes constant for z
                } else {
                    z_val = 0; // Fallback
                }
                row.push(z_val);
            }
            z_vals.push(row);
        }

        data.push({
            x: x_range,
            y: y_range,
            z: z_vals,
            type: 'surface',
            name: `${conKey} (${conType} ${rhs})`,
            opacity: 0.5,
            colorscale: [[0, colors[colorIndex % colors.length]], [1, colors[colorIndex % colors.length]]]
        });
        colorIndex++;
    }

    // Plot the optimal solution point
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
        marker: { size: 8, color: 'red', symbol: 'circle' }
    });

    Plotly.newPlot(plotDiv, data, layout);
}

function displaySensitivityAnalysis(result, constraints) {
    let sensitivityTextString = "Analyse de Sensibilité:\n";
    if (result.sensitivity && result.sensitivity.length > 0) {
        result.sensitivity.forEach(s => {
            sensitivityTextString += `- Contrainte ${s.constraint}: Prix dual = ${s.shadowPrice.toFixed(2)}, Augmentation permise = ${s.allowableIncrease.toFixed(2)}, Diminution permise = ${s.allowableDecrease.toFixed(2)}\n`;
        });
        sensitivityText.textContent = sensitivityTextString;
    } else {
        sensitivityText.textContent = "L'analyse de sensibilité n'est pas disponible pour ce problème.";
    }
}
