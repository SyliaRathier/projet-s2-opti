import streamlit as st
import numpy as np
import pandas as pd
from fractions import Fraction

st.set_page_config(page_title="Résolution de la Méthode du Simplexe", layout="centered")
st.title("Résolution de la Méthode du Simplexe (avec tableaux intermédiaires)")

st.markdown("""
Cet outil interactif vous permet de **résoudre un problème de programmation linéaire** en utilisant la méthode du **simplexe** avec **affichage des tableaux intermédiaires**.
""")

# Choix du type de problème
problem_type = st.selectbox("Type de problème", ["Maximisation", "Minimisation"])

# Fonction objectif
func_input = st.text_input("Fonction à optimiser (ex: 3x + 5y)", "3x + 5y")

# Contraintes
st.markdown("### Contraintes")
if "constraints" not in st.session_state:
    st.session_state.constraints = []

col1, col2, col3 = st.columns([4, 2, 2])
with col1:
    lhs = st.text_input("Expression (ex: 2x + 3y)", key="lhs")
with col2:
    operator = st.selectbox("Signe", ["<=", ">=", "="], key="op")
with col3:
    rhs = st.text_input("Valeur droite (ex: 12)", key="rhs")

if st.button("Ajouter contrainte"):
    if lhs and rhs:
        st.session_state.constraints.append((lhs.strip(), operator, float(rhs)))

if st.session_state.constraints:
    st.markdown("**Contraintes ajoutées :**")
    for i, (lhs, op, rhs) in enumerate(st.session_state.constraints):
        st.write(f"{lhs} {op} {rhs}")

# Parsing
import re
def parse_expression(expr, variables):
    coeffs = [0] * len(variables)
    for i, var in enumerate(variables):
        pattern = rf"([+-]?\s*\d*\.?\d*)\s*{var}"
        match = re.search(pattern, expr.replace("-", "+-"))
        if match:
            val = match.group(1).replace(" ", "")
            coeffs[i] = float(val) if val not in ["", "+", "-"] else float(val + "1")
    return coeffs

# Simplexe solver manuel
class SimplexSolver:
    def __init__(self, c, A, b, maximize=True):
        self.c = np.array(c, dtype=float)
        self.A = np.array(A, dtype=float)
        self.b = np.array(b, dtype=float)
        self.maximize = maximize
        self.m, self.n = self.A.shape
        self.logs = []
        self.setup()

    def setup(self):
        self.tableau = np.zeros((self.m + 1, self.n + self.m + 1))
        self.tableau[:-1, :self.n] = self.A
        self.tableau[:-1, self.n:self.n+self.m] = np.eye(self.m)
        self.tableau[:-1, -1] = self.b
        self.tableau[-1, :self.n] = -self.c if self.maximize else self.c

    def pivot(self):
        row, col = None, None
        # Find entering variable (pivot column)
        col = np.where(self.tableau[-1, :-1] < 0)[0]
        if len(col) == 0:
            return False
        col = col[0]

        # Find leaving variable (pivot row)
        ratios = []
        for i in range(self.m):
            if self.tableau[i, col] > 0:
                ratios.append(self.tableau[i, -1] / self.tableau[i, col])
            else:
                ratios.append(np.inf)
        row = np.argmin(ratios)
        if ratios[row] == np.inf:
            raise ValueError("Problème non borné")

        # Pivot operation
        self.logs.append(self.tableau.copy())
        self.tableau[row, :] /= self.tableau[row, col]
        for i in range(self.m + 1):
            if i != row:
                self.tableau[i, :] -= self.tableau[i, col] * self.tableau[row, :]

        return True

    def solve(self):
        while any(self.tableau[-1, :-1] < 0):
            if not self.pivot():
                break
        self.logs.append(self.tableau.copy())
        return self.tableau, self.logs

# Résolution
if st.button("Résoudre"):
    vars = sorted(set(re.findall(r'[a-zA-Z]', func_input)))
    c = parse_expression(func_input, vars)

    A, b = [], []
    for lhs, op, rhs in st.session_state.constraints:
        coeffs = parse_expression(lhs, vars)
        if op == "<=" or op == "=":
            A.append(coeffs)
            b.append(rhs)
        elif op == ">=":
            A.append([-c for c in coeffs])
            b.append(-rhs)

    solver = SimplexSolver(c, A, b, maximize=(problem_type == "Maximisation"))
    try:
        final_tab, logs = solver.solve()
        st.success("Solution trouvée !")

        for idx, tableau in enumerate(logs):
            df = pd.DataFrame(np.round(tableau, 4))
            st.write(f"**Tableau {idx + 1} :**")
            st.dataframe(df)

        st.markdown("### Résultat final")
        solution = final_tab[-1, -1]
        vars_values = final_tab[:-1, -1]
        for i, val in enumerate(vars_values[:len(vars)]):
            st.write(f"{vars[i]} = {round(val, 4)}")
        st.write(f"**Valeur optimale : {round(solution, 4)}**")
    except Exception as e:
        st.error(str(e))
