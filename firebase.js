// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCYfOtBqd4kKuQgmotYuRiHNtFQSnx2iz0",
    authDomain: "spectra25-fb7cf.firebaseapp.com",
    projectId: "spectra25-fb7cf",
    storageBucket: "spectra25-fb7cf.appspot.com",
    messagingSenderId: "189531230803",
    appId: "1:189531230803:web:81978d30b5001ec0586ca6",
    measurementId: "G-41XLWDDW7T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Update "Paid" status
async function updatePaidStatus(docId, currentStatus) {
    try {
        const docRef = doc(db, "registrations", docId);
        await updateDoc(docRef, {
            paid: currentStatus === "Yes" ? "No" : "Yes"
        });
        fetchUsers(); // Refresh the data
    } catch (error) {
        console.error("Error updating paid status:", error);
    }
}

// Update "Attendance" status
async function updateAttendanceStatus(docId, currentStatus) {
    try {
        const docRef = doc(db, "registrations", docId);
        await updateDoc(docRef, {
            attendence: currentStatus === "Yes" ? "No" : "Yes" // Note: "attendence" might be a typo, should be "attendance"
        });
        fetchUsers(); // Refresh the data
    } catch (error) {
        console.error("Error updating attendance status:", error);
    }
}

// Delete a registration
async function deleteRegistration(docId, teamName) {
    if (!confirm(`Delete the team "${teamName}"? This cannot be undone.`)) return;

    try {
        const docRef = doc(db, "registrations", docId);
        await deleteDoc(docRef);
        alert(`Team "${teamName}" has been deleted successfully.`);
        fetchUsers();
    } catch (error) {
        console.error("Error deleting registration:", error);
        alert("Failed to delete the team. Please try again.");
    }
}

// Fetch and display all users with optional filter
async function fetchUsers(filter = "All") {
    const fullTableBody = document.getElementById("userTable");
    const filteredTableBody = document.getElementById("filteredUserTable");
    const mckvCountEl = document.getElementById("mckvCount");
    const othersCountEl = document.getElementById("othersCount");
    const totalCount = document.getElementById("totalCount");

    if (fullTableBody) fullTableBody.innerHTML = "";
    if (filteredTableBody) filteredTableBody.innerHTML = "";

    let mckvCount = 0;
    let othersCount = 0;

    try {
        const querySnapshot = await getDocs(collection(db, "registrations"));

        querySnapshot.forEach((docSnap) => {
            const user = docSnap.data();
            const docId = docSnap.id;

            const college1 = (user.college1 || "").toLowerCase();
            const college2 = (user.college2 || "").toLowerCase();
            const isMckv = college1.includes("mckv") || college2.includes("mckv");

            if (isMckv) mckvCount++;
            else othersCount++;

            const showRow = (filter === "All") || 
                          (filter === "MCKV" && isMckv) || 
                          (filter === "Others" && !isMckv);
            if (!showRow) return;

            const paidButtonText = user.paid === "Yes" ? "Unpaid" : "Paid";
            const attendanceButtonText = user.attendence === "Yes" ? "Absent" : "Present";

            const rowHTML = `
                <tr>
                    <td>${user.teamName || "N/A"}</td>
                    <td>${user.name1 || "N/A"}<br>${user.name2 || "N/A"}</td>
                    <td>${user.email1 || "N/A"}<br>${user.email2 || "N/A"}</td>
                    <td>${user.phone1 || "N/A"}<br>${user.phone2 || "N/A"}</td>
                    <td>${user.college1 || "N/A"}<br>${user.college2 || "N/A"}</td>
                    <td>${user.department1 || "N/A"}<br>${user.department2 || "N/A"}</td>
                    <td>${user.paymentMethod || "N/A"}<br>${user.transactionId || "N/A"}</td>
                    <td>${user.paid || "N/A"}</td>
                    <td>${user.attendence || "N/A"}</td>
                   
                </tr>
            `;

            if (fullTableBody) fullTableBody.innerHTML += rowHTML;
            if (filteredTableBody) filteredTableBody.innerHTML += rowHTML;
        });

        if (mckvCountEl) mckvCountEl.textContent = ` ${mckvCount}`;
        if (othersCountEl) othersCountEl.textContent = ` ${othersCount}`;
        if (totalCount) totalCount.textContent = ` ${mckvCount + othersCount}`;

        addButtonEventListeners();

    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

// Add listeners to buttons dynamically
function addButtonEventListeners() {
    document.querySelectorAll(".paid-btn").forEach(button => {
        button.addEventListener("click", () => {
            updatePaidStatus(button.dataset.id, button.dataset.status);
        });
    });

    document.querySelectorAll(".attendance-btn").forEach(button => {
        button.addEventListener("click", () => {
            updateAttendanceStatus(button.dataset.id, button.dataset.status);
        });
    });

    document.querySelectorAll(".delete-btn").forEach(button => {
        button.addEventListener("click", () => {
            deleteRegistration(button.dataset.id, button.dataset.team);
        });
    });
}

// Search function based on team name for index.html, broader search for other pages
async function searchUsers(searchTerm) {
    const fullTableBody = document.getElementById("userTable"); // For index.html
    const filteredTableBody = document.getElementById("filteredUserTable"); // For filter.html
    const mckvCountEl = document.getElementById("mckvCount");
    const othersCountEl = document.getElementById("othersCount");
    const totalCount = document.getElementById("totalCount");

    const targetTableBody = fullTableBody || filteredTableBody;
    if (!targetTableBody) return;

    if (!searchTerm.trim()) {
        fetchUsers(); // Show all if search is empty
        return;
    }

    targetTableBody.innerHTML = "";
    let mckvCount = 0;
    let othersCount = 0;

    try {
        const querySnapshot = await getDocs(collection(db, "registrations"));

        querySnapshot.forEach((docSnap) => {
            const user = docSnap.data();
            const docId = docSnap.id;

            // Determine search scope based on page context
            let matchesSearch = false;
            if (fullTableBody) {
                // For index.html: Search only by team name
                const teamName = (user.teamName || "").toLowerCase();
                matchesSearch = teamName.includes(searchTerm.toLowerCase());
            } else {
                // For other pages: Broader search (team name, email, phone)
                const searchableText = `
                    ${user.teamName || ""}
                    ${user.email1 || ""}
                    ${user.email2 || ""}
                    ${user.phone1 || ""}
                    ${user.phone2 || ""}
                `.toLowerCase();
                matchesSearch = searchableText.includes(searchTerm.toLowerCase());
            }

            if (!matchesSearch) return;

            const college1 = (user.college1 || "").toLowerCase();
            const college2 = (user.college2 || "").toLowerCase();
            const isMckv = college1.includes("mckv") || college2.includes("mckv");

            if (isMckv) mckvCount++;
            else othersCount++;

            const paidButtonText = user.paid === "Yes" ? "Unpaid" : "Paid";
            const attendanceButtonText = user.attendence === "Yes" ? "Absent" : "Present";

            const rowHTML = `
                <tr>
                    <td>${user.teamName || "N/A"}</td>
                    <td>${user.name1 || "N/A"}<br>${user.name2 || "N/A"}</td>
                    <td>${user.email1 || "N/A"}<br>${user.email2 || "N/A"}</td>
                    <td>${user.phone1 || "N/A"}<br>${user.phone2 || "N/A"}</td>
                    <td>${user.college1 || "N/A"}<br>${user.college2 || "N/A"}</td>
                    <td>${user.department1 || "N/A"}<br>${user.department2 || "N/A"}</td>
                    <td>${user.paymentMethod || "N/A"}<br>${user.transactionId || "N/A"}</td>
                    <td>${user.paid || "N/A"}</td>
                    <td>${user.attendence || "N/A"}</td>
                    
                </tr>
            `;

            targetTableBody.innerHTML += rowHTML;
        });

        if (mckvCountEl) mckvCountEl.textContent = ` ${mckvCount}`;
        if (othersCountEl) othersCountEl.textContent = ` ${othersCount}`;
        if (totalCount) totalCount.textContent = ` ${mckvCount + othersCount}`;

        addButtonEventListeners();

    } catch (error) {
        console.error("Error searching users:", error);
    }
}

// On page load
document.addEventListener("DOMContentLoaded", () => {
    fetchUsers();

    const refreshBtn = document.querySelector(".refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => fetchUsers());
    }

    const collegeFilter = document.getElementById("collegeFilter");
    if (collegeFilter) {
        collegeFilter.addEventListener("change", function() {
            fetchUsers(this.value);
        });
    }

    const searchBtn = document.getElementById("searchBtn");
    const searchInput = document.getElementById("searchInput");

    if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", () => {
            searchUsers(searchInput.value);
        });

        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                searchUsers(searchInput.value);
            }
        });
    }
});

// Download CSV utility
function downloadCSV(dataArray, filename) {
    if (!dataArray.length) {
        alert("No data to export!");
        return;
    }

    const headers = Object.keys(dataArray[0]);
    const csvContent = [
        headers.join(","),
        ...dataArray.map(obj => headers.map(h => `"${(obj[h] || "").toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Generate CSV data and split by college type
async function generateCSVData() {
    const querySnapshot = await getDocs(collection(db, "registrations"));
    const mckvData = [];
    const othersData = [];

    querySnapshot.forEach((docSnap) => {
        const user = docSnap.data();
        const isMckv = (user.college1 || "").toLowerCase().includes("mckv") ||
                      (user.college2 || "").toLowerCase().includes("mckv");

        const row = {
            "Team Name": user.teamName || "",
            "Name 1": user.name1 || "",
            "Name 2": user.name2 || "",
            "Email 1": user.email1 || "",
            "Email 2": user.email2 || "",
            "Phone 1": user.phone1 || "",
            "Phone 2": user.phone2 || "",
            "College 1": user.college1 || "",
            "College 2": user.college2 || "",
            "Department 1": user.department1 || "",
            "Department 2": user.department2 || "",
            "Payment Method": user.paymentMethod || "",
            "Transaction ID": user.transactionId || "",
            "Paid": user.paid || "",
            "Attendance": user.attendence || ""
        };

        if (isMckv) mckvData.push(row);
        else othersData.push(row);
    });

    return { mckvData, othersData };
}

// Button handlers for CSV download
document.addEventListener("DOMContentLoaded", () => {
    const downloadMckvBtn = document.getElementById("downloadMckvCsv");
    const downloadOthersBtn = document.getElementById("downloadOthersCsv");

    if (downloadMckvBtn) {
        downloadMckvBtn.addEventListener("click", async () => {
            const { mckvData } = await generateCSVData();
            downloadCSV(mckvData, "MCKV_Registrations.csv");
        });
    }

    if (downloadOthersBtn) {
        downloadOthersBtn.addEventListener("click", async () => {
            const { othersData } = await generateCSVData();
            downloadCSV(othersData, "Other_College_Registrations.csv");
        });
    }
});

// Show registrations by paid filter
async function fetchPaidFilteredData(paidValue) {
    const querySnapshot = await getDocs(collection(db, "registrations"));
    const filteredData = [];

    querySnapshot.forEach((docSnap) => {
        const user = docSnap.data();

        if ((user.paid || "").toLowerCase() === paidValue.toLowerCase()) {
            filteredData.push({
                "Team Name": user.teamName || "",
                "Name 1": user.name1 || "",
                "Name 2": user.name2 || "",
                "Email 1": user.email1 || "",
                "Email 2": user.email2 || "",
                "Phone 1": user.phone1 || "",
                "Phone 2": user.phone2 || "",
                "College 1": user.college1 || "",
                "College 2": user.college2 || "",
                "Paid": user.paid || ""
            });
        }
    });

    return filteredData;
}

function displayPaidData(dataArray) {
    const tbody = document.getElementById("paidTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">No data found</td></tr>`;
        return;
    }

    dataArray.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row["Team Name"]}</td>
            <td>${row["Name 1"]}<br>${row["Name 2"]}</td>
            <td>${row["Email 1"]}<br>${row["Email 2"]}</td>
            <td>${row["Phone 1"]}<br>${row["Phone 2"]}</td>
            <td>${row["College 1"]}<br>${row["College 2"]}</td>
            <td>${row["Paid"]}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Paid filter and summary
async function updatePaidSummary() {
    try {
        const querySnapshot = await getDocs(collection(db, "registrations"));
        let paidCount = 0;
        let unpaidCount = 0;

        querySnapshot.forEach((docSnap) => {
            const user = docSnap.data();
            if ((user.paid || "").toLowerCase() === "yes") paidCount++;
            else if ((user.paid || "").toLowerCase() === "no") unpaidCount++;
        });

        const totalPaidEl = document.getElementById("totalPaid");
        const totalUnpaidEl = document.getElementById("totalUnpaid");
        
        if (totalPaidEl) totalPaidEl.textContent = paidCount;
        if (totalUnpaidEl) totalUnpaidEl.textContent = unpaidCount;
    } catch (error) {
        console.error("Error updating paid summary:", error);
    }
}

// Event listeners for paid filter and download
document.addEventListener("DOMContentLoaded", () => {
    const filterDropdown = document.getElementById("paidFilter");
    const downloadBtn = document.getElementById("downloadFilteredCsv");
    let currentFilteredData = [];

    updatePaidSummary();

    if (filterDropdown) {
        filterDropdown.addEventListener("change", async () => {
            const selected = filterDropdown.value;
            if (!selected) return;

            currentFilteredData = await fetchPaidFilteredData(selected);
            displayPaidData(currentFilteredData);
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            if (currentFilteredData.length) {
                downloadCSV(currentFilteredData, `Paid_${filterDropdown.value}_Registrations.csv`);
            } else {
                alert("No data to download!");
            }
        });
    }
});

// Analytics charts
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("analytics.html")) {
        loadAnalyticsCharts();
    }
});

async function loadAnalyticsCharts() {
    try {
        const querySnapshot = await getDocs(collection(db, "registrations"));
        let paidCount = 0;
        let unpaidCount = 0;
        let mckvCount = 0;
        let otherCollegeCount = 0;

        querySnapshot.forEach((docSnap) => {
            const user = docSnap.data();
            const paid = (user.paid || "").toLowerCase();
            const college1 = (user.college1 || "").toLowerCase();
            const college2 = (user.college2 || "").toLowerCase();

            if (paid === "yes") paidCount++;
            else if (paid === "no") unpaidCount++;

            if (college1.includes("mckv") || college2.includes("mckv")) mckvCount++;
            else otherCollegeCount++;
        });

        const pieChartEl = document.getElementById("paidPieChart");
        const donutChartEl = document.getElementById("collegeDonutChart");

        if (pieChartEl) {
            new Chart(pieChartEl.getContext("2d"), {
                type: 'pie',
                data: {
                    labels: ['Paid', 'Unpaid'],
                    datasets: [{
                        data: [paidCount, unpaidCount],
                        backgroundColor: ['green', 'red'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        datalabels: {
                            formatter: (value, ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                return `${((value / total) * 100).toFixed(1)}%`;
                            },
                            color: '#fff',
                            font: { weight: 'bold', size: 14 }
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }

        if (donutChartEl) {
            new Chart(donutChartEl.getContext("2d"), {
                type: 'doughnut',
                data: {
                    labels: ['MCKV', 'Other Colleges'],
                    datasets: [{
                        data: [mckvCount, otherCollegeCount],
                        backgroundColor: ['#007bff', '#ffc107'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'top' },
                        datalabels: {
                            formatter: (value, ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                return `${((value / total) * 100).toFixed(1)}%`;
                            },
                            color: '#fff',
                            font: { weight: 'bold', size: 14 }
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }
    } catch (error) {
        console.error("Error loading analytics charts:", error);
    }
}

// Export functions globally
window.updatePaidStatus = updatePaidStatus;
window.updateAttendanceStatus = updateAttendanceStatus;
window.deleteRegistration = deleteRegistration;
