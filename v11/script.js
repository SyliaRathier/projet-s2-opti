// --- Custom Modal Logic ---
const customModal = document.getElementById('custom-modal');
const modalMessage = document.getElementById('modal-message');
const modalOkButton = document.getElementById('modal-ok-button');
const modalCancelButton = document.getElementById('modal-cancel-button');
let currentModalCallback = null;

/**
 * Affiche un modal personnalisé avec un message et des boutons.
 * @param {string} message - Le message à afficher dans le modal.
 * @param {'ok'|'confirm'} type - Le type de modal ('ok' pour un seul bouton OK, 'confirm' pour OK et Annuler).
 * @param {function(boolean): void} [callback] - Fonction de rappel appelée lorsque l'utilisateur clique sur OK (true) ou Annuler (false).
 */
function showModal(message, type = 'ok', callback = null) {
    modalMessage.textContent = message;
    customModal.classList.remove('hidden');
    currentModalCallback = callback;

    if (type === 'confirm') {
        modalOkButton.textContent = 'Confirmer';
        modalCancelButton.classList.remove('hidden');
    } else {
        modalOkButton.textContent = 'OK';
        modalCancelButton.classList.add('hidden');
    }
}

/** Cache le modal personnalisé. */
function hideModal() {
    customModal.classList.add('hidden');
    currentModalCallback = null;
}

modalOkButton.addEventListener('click', () => {
    if (currentModalCallback) {
        currentModalCallback(true); // Passe true pour OK/Confirmer
    }
    hideModal();
});

modalCancelButton.addEventListener('click', () => {
    if (currentModalCallback) {
        currentModalCallback(false); // Passe false pour Annuler
    }
    hideModal();
});

// --- Fonction de bascule du mode clair/sombre ---
function toggleMode() {
    const body = document.body;
    const modeToggle = document.querySelector('.mode-toggle');
    const icon = modeToggle.querySelector('i');

    body.classList.toggle('dark-mode');

    // Sauvegarde la préférence dans le localStorage
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        icon.classList.replace('ph-moon', 'ph-sun'); // Change l'icône en soleil
        modeToggle.setAttribute('aria-label', 'Passer en mode clair');
    } else {
        localStorage.setItem('theme', 'light');
        icon.classList.replace('ph-sun', 'ph-moon'); // Change l'icône en lune
        modeToggle.setAttribute('aria-label', 'Passer en mode sombre');
    }
}

// --- Variables et écouteurs d'événements pour la logique de l'application ---
const objectiveFunctionInput = document.getElementById('objective-function');
const constraintsContainer = document.getElementById('constraints-container');
const solveButton = document.getElementById('solve-button');
const outputSection = document.getElementById('output-section');
const solutionText = document.getElementById('solution-text');
const graphSection = document.getElementById('graph-section');
// graphCanvas est commenté car il n'est pas utilisé directement dans plotSolution avec Plotly
// const graphCanvas = document.getElementById('graph-canvas');
const sensitivitySection = document.getElementById('sensitivity-section');
const sensitivityText = document.getElementById('sensitivity-text');
const tableauxSection = document.getElementById('tableaux-section');
const saveButton = document.getElementById('save-button'); // Référence au bouton de sauvegarde

let chartInstance = null; // Pour Chart.js si utilisé, mais Plotly est utilisé ici
let currentResult = null; // Stocke le dernier résultat de résolution

/**
 * Met à jour les boutons d'ajout/suppression de contraintes.
 * Assure que seul le dernier groupe de contraintes a un bouton d'ajout.
 */
function updateConstraintButtons() {
    const constraintGroups = constraintsContainer.querySelectorAll('.constraint-group');
    constraintGroups.forEach((group, index) => {
        let removeButton = group.querySelector('.remove-constraint');
        if (removeButton) {
            removeButton.remove(); // Supprime le bouton existant pour le recréer si nécessaire
        }

        // Ajoute un bouton de suppression si plus d'une contrainte
        if (constraintGroups.length > 1) {
            removeButton = document.createElement('button');
            removeButton.setAttribute('type', 'button');
            removeButton.classList.add(
                'remove-constraint',
                'bg-red-500', 'hover:bg-red-600', 'text-white', 'rounded-full', 'p-2', 'transition',
                'flex', 'items-center', 'justify-center', 'min-w-[36px]', 'min-h-[36px]'
            );
            removeButton.setAttribute('title', 'Supprimer la contrainte');
            removeButton.innerHTML = '<i class="ph-bold ph-minus"></i>';
            removeButton.onclick = () => {
                group.remove();
                updateConstraintButtons(); // Met à jour les boutons après la suppression
            };
            group.appendChild(removeButton);
        }

        // S'assure que seul le dernier groupe de contraintes a le bouton d'ajout
        const currentAddButton = group.querySelector('.add-constraint');
        if (index === constraintGroups.length - 1) {
            if (!currentAddButton) {
                const newAddButton = document.createElement('button');
                newAddButton.setAttribute('type', 'button');
                newAddButton.classList.add(
                    'add-constraint',
                    'bg-indigo-600', 'hover:bg-indigo-700', 'text-white', 'rounded-full', 'p-2', 'transition',
                    'flex', 'items-center', 'justify-content-center', 'min-w-[36px]', 'min-h-[36px]'
                );
                newAddButton.setAttribute('title', 'Ajouter une contrainte');
                newAddButton.innerHTML = '<i class="ph-bold ph-plus"></i>';
                newAddButton.onclick = handleAddConstraint;
                group.appendChild(newAddButton);
            }
        } else {
            if (currentAddButton) {
                currentAddButton.remove();
            }
        }
    });
}

/** Ajoute un nouveau groupe de champs pour une contrainte. */
function handleAddConstraint() {
    const newConstraintGroup = document.createElement('div');
    newConstraintGroup.classList.add('constraint-group', 'flex', 'flex-col', 'sm:flex-row', 'items-center', 'space-y-3', 'sm:space-y-0', 'sm:space-x-3', 'mb-3');
    newConstraintGroup.innerHTML = `
                <input type="text" placeholder="Nom de la contrainte"
                    class="constraint-name flex-1 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700" />

                <input type="text" placeholder="2x + y"
                    class="constraint-expression flex-1 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700" />

                <select
                    class="constraint-operator border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 w-full sm:w-auto">
                    <option value="<=">≤</option>
                    <option value=">=">≥</option>
                    <option value="=">=</option>
                </select>

                <input type="text" placeholder="10"
                    class="constraint-value w-full sm:w-20 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700" />
            `;
    constraintsContainer.appendChild(newConstraintGroup);
    updateConstraintButtons(); // Met à jour les boutons après l'ajout
}

// Écouteur pour le bouton de résolution
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

        if (!objectiveFunction) {
            throw new Error("Veuillez entrer une fonction objective.");
        }
        if (constraints.length === 0) {
            throw new Error("Veuillez entrer au moins une contrainte.");
        }

        // Vérifie si LinearProgrammingSolver est défini (vient de simplexe2phases.js)
        if (typeof LinearProgrammingSolver === 'undefined') {
            throw new Error("Le solveur de programmation linéaire (simplexe2phases.js) n'est pas chargé.");
        }

        const problem = parseProblem(objectiveFunction, constraints, optimizationType);

        console.log("Problème analysé:", problem);
        const solver = new LinearProgrammingSolver(problem);
        const result = solver.solve();
        console.log("Résultat du solveur:", result);

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
        showModal("Erreur : " + error.message, 'ok');
    }
});

/**
 * Analyse les données du formulaire pour créer un objet problème compatible avec le solveur.
 * @param {string} objectiveFunction - L'expression de la fonction objective (ex: "3x + 5y").
 * @param {Array<Object>} constraints - Tableau d'objets contraintes.
 * @param {string} optimizationType - Type d'optimisation ('max' ou 'min').
 * @returns {Object} L'objet problème analysé.
 */
function parseProblem(objectiveFunction, constraints, optimizationType) {
    const objectiveName = document.getElementById('objective-name').value || 'objectif';
    const problem = {
        optimize: objectiveName,
        opType: optimizationType,
        constraints: {},
        variables: {}
    };

    // Analyser la fonction objective
    const objectiveParts = objectiveFunction.split(/([+-]?\d*\.?\d*[a-zA-Z]+)/).filter(Boolean);
    objectiveParts.forEach(part => {
        const match = part.match(/([+-]?\d*\.?\d*)([a-zA-Z]+)/);
        if (match) {
            const coeff = match[1] === '-' ? -1 : match[1] === '+' ? 1 : parseFloat(match[1] || 1);
            const varName = match[2];
            problem.variables[varName] = { [objectiveName]: coeff };
        }
    });

    // Analyser les contraintes
    constraints.forEach((constraint, index) => {
        const constraintName = constraint.name || `c${index + 1}`;
        const parts = constraint.expression.split(/([+-]?\d*\.?\d*[a-zA-Z]+)/).filter(Boolean);
        const constraintObj = {};

        parts.forEach(part => {
            const match = part.match(/([+-]?\d*\.?\d*)([a-zA-Z]+)/);
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

/**
 * Affiche la solution optimale.
 * @param {Object} result - L'objet résultat du solveur.
 * @param {Object} problem - L'objet problème analysé.
 */
function displaySolution(result, problem) {
    let solutionTextString = "<div class='solution-container text-gray-800 dark:text-gray-200'>";
    solutionTextString += "<h3 class='text-xl font-semibold text-indigo-700 dark:text-indigo-400 mb-2'>Solution Optimale</h3>";
    solutionTextString += `<p class='mb-2'>La solution optimale de la fonction objective ${problem.optimize} est atteinte pour :</p>`;
    solutionTextString += "<ul class='list-disc list-inside mb-4'>";
    for (const [variable, value] of Object.entries(result.variables)) {
        solutionTextString += `<li>${variable} = ${value.toFixed(3)}</li>`; // Arrondi pour l'affichage
    }
    solutionTextString += "</ul>";
    solutionTextString += `<p class='font-bold'>Valeur de la fonction objective ${problem.optimize} : ${result.p.toFixed(2)}</p>`;
    solutionTextString += "</div>";
    solutionText.innerHTML = solutionTextString;
}

/**
 * Affiche les tableaux du simplexe.
 * @param {Array<Object>} tableaux - Tableau des tableaux du simplexe.
 */
function displayTableaux(tableaux) {
    const tableauxResultsDiv = document.getElementById('tableauxResults');
    tableauxResultsDiv.innerHTML = '';

    tableaux.forEach((tab, i) => {
        const tableauContainer = document.createElement('div');
        tableauContainer.classList.add('tableau-container', 'mb-6', 'overflow-x-auto'); // Ajout de overflow-x-auto
        tableauContainer.innerHTML = `<h3 class="text-lg font-semibold text-indigo-700 dark:text-indigo-400 mb-2">Tableau ${i + 1}:</h3>`;

        const table = document.createElement('table');
        table.classList.add('min-w-full', 'divide-y', 'divide-gray-200', 'dark:divide-gray-700', 'shadow-md', 'rounded-lg', 'overflow-hidden');
        const thead = document.createElement('thead');
        thead.classList.add('bg-gray-50', 'dark:bg-gray-700');
        const tbody = document.createElement('tbody');
        tbody.classList.add('bg-white', 'dark:bg-gray-800', 'divide-y', 'divide-gray-200', 'dark:divide-gray-700');


        // Headers
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Basis</th>` + tab.headers.map(header => `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${header}</th>`).join('');
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
            tr.classList.add('hover:bg-gray-100', 'dark:hover:bg-gray-700');
            const label = rIdx < tab.basis.length ? "*" + tab.basis[rIdx] : "Z";

            tr.innerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${label}</td>` + row.map((val, cIdx) => {
                let cellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';
                if (rIdx === pivotRow && cIdx === pivotCol) cellClass += ' pivot-cell';
                else if (rIdx === pivotRow) cellClass += ' pivot-row';
                else if (cIdx === pivotCol) cellClass += ' pivot-col';

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

/**
 * Trace la solution graphique (2D ou 3D).
 * @param {Object} problem - L'objet problème analysé.
 * @param {Object} result - L'objet résultat du solveur.
 */
function plotSolution(problem, result) {
    const plotDiv = document.getElementById('plot');
    const variables = Object.keys(problem.variables);

    if (variables.length === 2) {
        plot2D(problem, result, plotDiv);
    } else if (variables.length === 3) {
        plot3D(problem, result, plotDiv);
    } else {
        plotDiv.innerHTML = '<p class="text-gray-700 dark:text-gray-300">La visualisation graphique est disponible pour les problèmes à 2 ou 3 variables.</p>';
        Plotly.newPlot(plotDiv, [], {}); // Efface tout tracé précédent
    }
}

/**
 * Trace la solution en 2D.
 * @param {Object} problem - L'objet problème analysé.
 * @param {Object} result - L'objet résultat du solveur.
 * @param {HTMLElement} plotDiv - L'élément DIV où tracer le graphique.
 */
function plot2D(problem, result, plotDiv) {
    const data = [];

    const xVar = Object.keys(problem.variables)[0];
    const yVar = Object.keys(problem.variables)[1];

    const constraints = problem.constraints;
    const variables = problem.variables;

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

    maxX = Math.max(maxX, (result.variables[xVar] || 0) * 1.5 + 5, 10); // Assure une taille minimale
    maxY = Math.max(maxY, (result.variables[yVar] || 0) * 1.5 + 5, 10); // Assure une taille minimale


    const layout = {
        title: 'Région Faisable et Fonction Objective (2D)',
        xaxis: {
            title: xVar,
            range: [0, maxX],
            zeroline: true,
            zerolinecolor: '#969696',
            gridcolor: '#e0e0e0'
        },
        yaxis: {
            title: yVar,
            range: [0, maxY],
            zeroline: true,
            zerolinecolor: '#969696',
            gridcolor: '#e0e0e0'
        },
        hovermode: 'closest',
        showlegend: true,
        paper_bgcolor: 'var(--input-background)', // Utilise la variable CSS
        plot_bgcolor: 'var(--input-background)', // Utilise la variable CSS
        font: {
            color: 'var(--text-color)' // Utilise la variable CSS
        }
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
        name: `Solution Optimale (p = ${result.p.toFixed(2)})`,
        marker: { size: 12, color: 'red', symbol: 'star' }
    });

    Plotly.newPlot(plotDiv, data, layout);
}

/**
 * Trace la solution en 3D.
 * @param {Object} problem - L'objet problème analysé.
 * @param {Object} result - L'objet résultat du solveur.
 * @param {HTMLElement} plotDiv - L'élément DIV où tracer le graphique.
 */
function plot3D(problem, result, plotDiv) {
    const data = [];
    const layout = {
        title: 'Région Faisable et Fonction Objective (3D)',
        showlegend: true,
        scene: {
            xaxis: { title: Object.keys(problem.variables)[0], zerolinecolor: '#969696', gridcolor: '#e0e0e0' },
            yaxis: { title: Object.keys(problem.variables)[1], zerolinecolor: '#969696', gridcolor: '#e0e0e0' },
            zaxis: { title: Object.keys(problem.variables)[2], zerolinecolor: '#969696', gridcolor: '#e0e0e0' }
        },
        legend: {
            x: 1,
            y: 1
        },
        paper_bgcolor: 'var(--input-background)',
        plot_bgcolor: 'var(--input-background)',
        font: {
            color: 'var(--text-color)'
        }
    };

    const xVar = Object.keys(problem.variables)[0];
    const yVar = Object.keys(problem.variables)[1];
    const zVar = Object.keys(problem.variables)[2];

    const constraints = problem.constraints;
    const variables = problem.variables;

    let maxX = 0,
        maxY = 0,
        maxZ = 0;
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
    maxX = Math.max(maxX, (result.variables[xVar] || 0) * 1.5 + 5, 10);
    maxY = Math.max(maxY, (result.variables[yVar] || 0) * 1.5 + 5, 10);
    maxZ = Math.max(maxZ, (result.variables[zVar] || 0) * 1.5 + 5, 10);


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
            x: [null],
            y: [null],
            z: [null],
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
        name: `Solution Optimale (p=${result.p.toFixed(2)})`,
        marker: { size: 8, color: 'red', symbol: 'circle' },
        showlegend: true
    });

    Plotly.newPlot(plotDiv, data, layout);
}

/**
 * Affiche l'analyse de sensibilité.
 * @param {Object} result - L'objet résultat du solveur.
 * @param {Array<Object>} constraints - Tableau d'objets contraintes.
 */
function displaySensitivityAnalysis(result, constraints) {
    let sensitivityTextString = "<h3 class='text-xl font-semibold text-indigo-700 dark:text-indigo-400 mb-2'>Analyse de Sensibilité</h3>";
    if (result.sensitivity && result.sensitivity.length > 0) {
        sensitivityTextString += "<ul class='list-disc list-inside mb-4'>";
        result.sensitivity.forEach(s => {
            sensitivityTextString += `<li>- Contrainte ${s.constraint}: Prix dual = ${s.shadowPrice.toFixed(2)}, Augmentation permise = ${s.allowableIncrease.toFixed(2)}, Diminution permise = ${s.allowableDecrease.toFixed(2)}</li>`;
        });
        sensitivityTextString += "</ul>";
        sensitivityText.innerHTML = sensitivityTextString;
    } else {
        sensitivityText.innerHTML = "<p class='text-gray-700 dark:text-gray-300'>L'analyse de sensibilité n'est pas disponible pour ce problème.</p>";
    }
}

// --- Fonctions pour la sauvegarde et le chargement des problèmes ---

// Fonction pour sauvegarder le problème actuel dans le local storage
saveButton.addEventListener('click', () => {
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
        showModal("Aucun résultat à sauvegarder. Résolvez d'abord le problème.", 'ok');
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

    showModal("Problème sauvegardé avec succès !", 'ok');
    displaySavedProblems();
});

// Fonction pour afficher la liste des problèmes sauvegardés
function displaySavedProblems() {
    const savedProblemsList = document.getElementById('saved-problems-list');
    savedProblemsList.innerHTML = '';

    const savedProblems = JSON.parse(localStorage.getItem('savedProblems')) || [];
    if (savedProblems.length === 0) {
        savedProblemsList.innerHTML = '<p class="text-gray-600 dark:text-gray-400">Aucun problème sauvegardé pour le moment.</p>';
        return;
    }

    savedProblems.forEach((problem, index) => {
        const problemDiv = document.createElement('div');
        problemDiv.className = 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between shadow-sm border border-gray-200 dark:border-gray-600';
        problemDiv.innerHTML = `
            <div>
                <h4 class="font-semibold text-gray-800 dark:text-gray-200">${problem.objectiveName}</h4>
                <p class="text-sm text-gray-700 dark:text-gray-300">${problem.objectiveFunction}</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">Type: ${problem.optimizationType === 'max' ? 'Maximisation' : 'Minimisation'}</p>
            </div>
            <div class="flex space-x-2">
                <button class="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 text-sm"
                    onclick="showModal('Chargement du problème ${problem.objectiveName}', 'ok', () => loadProblem(${index}))">
                    <i class="ph-bold ph-download"></i>
                </button>
                <button class="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 text-sm"
                    onclick="showModal('Voulez-vous vraiment supprimer le problème ${problem.objectiveName} ?', 'confirm', () => deleteProblem(${index}))">
                    <i class="ph-bold ph-trash"></i>
                </button>
            </div>
        `;
        savedProblemsList.appendChild(problemDiv);
    });
}

/**
 * Supprime un problème sauvegardé par son index.
 * @param {number} index - L'index du problème à supprimer.
 */
function deleteProblem(index) {
    let savedProblems = JSON.parse(localStorage.getItem('savedProblems')) || [];
    savedProblems.splice(index, 1);
    localStorage.setItem('savedProblems', JSON.stringify(savedProblems));
    displaySavedProblems();
    showModal("Problème supprimé avec succès !", 'ok');
}

/**
 * Charge un problème sauvegardé dans le formulaire.
 * @param {number} index - L'index du problème à charger.
 */
function loadProblem(index) {
    const savedProblems = JSON.parse(localStorage.getItem('savedProblems')) || [];
    const problem = savedProblems[index];

    // Remplir les champs avec les valeurs du problème sauvegardé
    document.getElementById('objective-name').value = problem.objectiveName;
    objectiveFunctionInput.value = problem.objectiveFunction;
    document.getElementById('optimization-type').value = problem.optimizationType;

    // Effacer les contraintes actuelles
    constraintsContainer.innerHTML = '';

    // Ajouter les contraintes sauvegardées et mettre à jour les boutons
    problem.constraints.forEach(constraint => {
        handleAddConstraint(); // Ajoute un nouveau groupe avec les classes et boutons par défaut
        const constraintGroups = constraintsContainer.querySelectorAll('.constraint-group');
        const lastGroup = constraintGroups[constraintGroups.length - 1];
        lastGroup.querySelector('.constraint-name').value = constraint.name;
        lastGroup.querySelector('.constraint-expression').value = constraint.expression;
        lastGroup.querySelector('.constraint-operator').value = constraint.operator;
        lastGroup.querySelector('.constraint-value').value = constraint.value;
    });

    // Si le problème n'avait pas de contraintes, assurez-vous qu'il y en a au moins une vide
    if (problem.constraints.length === 0) {
        handleAddConstraint();
    }

    // Afficher la solution si elle est sauvegardée
    if (problem.solution) {
        displaySolution(problem.solution, parseProblem(problem.objectiveFunction, problem.constraints, problem.optimizationType));
        outputSection.classList.remove('hidden');
        // Note: Les tableaux, graphiques et analyses de sensibilité ne sont pas sauvegardés dans le problème
        // Il faudrait les recalculer si on veut les afficher après un chargement.
        // Pour l'instant, on les cache.
        tableauxSection.classList.add('hidden');
        graphSection.classList.add('hidden');
        sensitivitySection.classList.add('hidden');
    }
}

// --- Initialisation de la page au chargement du DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // Applique le thème sauvegardé au chargement de la page
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const modeToggle = document.querySelector('.mode-toggle');
    const icon = modeToggle.querySelector('i');

    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        icon.classList.replace('ph-moon', 'ph-sun');
        modeToggle.setAttribute('aria-label', 'Passer en mode clair');
    } else {
        icon.classList.replace('ph-sun', 'ph-moon');
        modeToggle.setAttribute('aria-label', 'Passer en mode sombre');
    }

    // Initialise le premier groupe de contraintes s'il n'y en a pas
    if (constraintsContainer.querySelectorAll('.constraint-group').length === 0) {
        handleAddConstraint();
    } else {
        // Met à jour les boutons pour les contraintes existantes au chargement
        updateConstraintButtons();
    }

    // Charge la liste des problèmes sauvegardés au chargement de la page
    displaySavedProblems();
});
