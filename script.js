const expenseForm = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");
const totalAmount = document.getElementById("total-amount");
const currencySelector = document.getElementById("currency-selector");
const ctx = document.getElementById("expense-chart")?.getContext("2d");

let expenses = [];
try {
    expenses = JSON.parse(localStorage.getItem("expenses")) || [];
} catch (error) {
    console.error("Error loading expenses from localStorage:", error);
    expenses = [];
}

const API_KEY = "8d00119da5734f4b9dc825b1fd6d15a6";
let exchangeRates = {};
let currentCurrency = "USD";

const currencySymbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    INR: "₹",
    JPY: "¥"
};

// Initialize chart only if canvas exists
let expenseChart;
if (ctx) {
    expenseChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Expenses by Category",
                data: [],
                backgroundColor: ["#3E7CB1", "#7DAA92", "#C49A6C", "#6C5B7B", "#FF8C42"],
                borderColor: "#2C3E50",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return currencySymbols[currentCurrency] + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

async function fetchExchangeRates() {
    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/USD?apikey=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        exchangeRates = data.rates;
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
        alert("Failed to fetch exchange rates. Using default USD rates.");
    }
}

expenseForm?.addEventListener("submit", function(e) {
    e.preventDefault();

    const nameInput = document.getElementById("expense-name");
    const amountInput = document.getElementById("expense-amount");
    const categoryInput = document.getElementById("expense-category");

    const name = nameInput?.value?.trim();
    const amount = parseFloat(amountInput?.value || "0");
    const category = categoryInput?.value;

    if (!name || !amount || !category) {
        alert("Please fill out all fields.");
        return;
    }

    if (amount <= 0) {
        alert("Amount must be greater than 0.");
        return;
    }

    const expense = {
        id: Date.now(),
        name,
        amount,
        category,
        date: new Date().toISOString()
    };

    expenses.push(expense);
    
    try {
        localStorage.setItem("expenses", JSON.stringify(expenses));
    } catch (error) {
        console.error("Error saving to localStorage:", error);
        alert("Failed to save expense. Please try again.");
        expenses.pop();
        return;
    }

    expenseForm.reset();
    renderExpenses();
    updateChart();
});

function renderExpenses() {
    if (!expenseList) return;
    
    expenseList.innerHTML = "";
    let total = 0;
    const symbol = currencySymbols[currentCurrency] || "$";

    expenses.forEach((expense) => {
        const convertedAmount = (expense.amount * (exchangeRates[currentCurrency] || 1)).toFixed(2);
        total += parseFloat(convertedAmount);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(expense.name)}</td>
            <td>${symbol}${convertedAmount}</td>
            <td>${escapeHtml(expense.category)}</td>
            <td>
                <button class="delete-btn" onclick="deleteExpense(${expense.id})">Delete</button>
            </td>
        `;
        expenseList.appendChild(row);
    });

    if (totalAmount) {
        totalAmount.textContent = `${symbol}${total.toFixed(2)}`;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function deleteExpense(id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    expenses = expenses.filter((expense) => expense.id !== id);
    
    try {
        localStorage.setItem("expenses", JSON.stringify(expenses));
    } catch (error) {
        console.error("Error saving to localStorage:", error);
        alert("Failed to delete expense. Please try again.");
        return;
    }

    renderExpenses();
    updateChart();
}

function convertCurrency() {
    const selectedCurrency = currencySelector?.value;

    if (!selectedCurrency) return;

    if (!exchangeRates[selectedCurrency]) {
        alert("Exchange rate not available. Try again later.");
        return;
    }

    currentCurrency = selectedCurrency;
    renderExpenses();
    updateChart();
}

function updateChart() {
    if (!expenseChart) return;

    const categoryTotals = expenses.reduce((acc, expense) => {
        const convertedAmount = expense.amount * (exchangeRates[currentCurrency] || 1);
        acc[expense.category] = (acc[expense.category] || 0) + convertedAmount;
        return acc;
    }, {});

    const categories = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    expenseChart.data.labels = categories;
    expenseChart.data.datasets[0].data = values;
    expenseChart.update();
}

// Initialize the application
async function initApp() {
    await fetchExchangeRates();
    renderExpenses();
    updateChart();
}

initApp();