function initDropzoneSettings() {
    if (window.Dropzone) {
        console.log("Dropzone configured successfully.");
    } else {
        setTimeout(initDropzoneSettings, 50);
    }
}
initDropzoneSettings();

let rawOutputBox;
let tableBody;
const scannedItems = {};
var uploadedFileMetaList = [];
var inventoryList = [];
let manualRowTemplate = null;
let SelectedPOId = 0;
let expiryConfig = { warningDays: 60, blockDays: 0 };

async function loadExpiryConfig(centerId) {
    if (!centerId) return;
    try {
        const res = await fetch(`/MaterialReceiving/GetExpiryConfig?centerId=${centerId}`);
        const data = await res.json();
        expiryConfig.warningDays = data.warningDays ?? 60;
        expiryConfig.blockDays = data.blockDays ?? 0;
        console.log(`Expiry config loaded for center ${centerId}:`, expiryConfig);
    } catch (e) {
        console.warn("Could not load expiry config, using defaults.", e);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    rawOutputBox = document.getElementById("rawOutput");
    tableBody = document.getElementById("scanTableBody");
    manualRowTemplate = document.getElementById('manual_row_template');

    if (rawOutputBox) {
        rawOutputBox.focus();

        rawOutputBox.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                clearTimeout(scanDebounce);
                const rawValue = rawOutputBox.value;
                const lines = rawValue.replace(/\r\n|\r/g, "\n").split("\n");
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (line.length > 3) {
                        splitScannedText(line);
                        break;
                    }
                }
            }
        });
    }  // ✅ closes if (rawOutputBox)

    var centerIdElement = document.getElementById("Center");
    if (centerIdElement && centerIdElement.value) {
        loadExpiryConfig(centerIdElement.value);
        loadInventories(centerIdElement.value);
        loadPOs(centerIdElement.value);
    }
}); // ✅ closes DOMContentLoaded
var MaterialReceiving = {
    DetailsMRModal: function (id) {
        $("#purchase-request--loader").show();
        $.ajax({
            type: "GET",
            url: "/MaterialReceiving/GetMaterialReceivingDetails?id=" + id,
            contentType: "application/json; charset=utf-8",
            dataType: "html",
            success: function (data) {
                $('#_DetailsMaterialReceiving').html(data);
                $("#purchase-request--loader").hide();
                $('#modalDetailsMaterialReceiving').modal('show');
            },
            error: function (xhr) {
                $("#purchase-request--loader").hide();
                alert("Error loading details: " + xhr.statusText);
            }
        });
    },

    ToggleReupload: function () {
        if (confirm("Are you sure you want to replace the current receipt?")) {
            $("#existingReceipt").hide();
            $("#reuploadSection").show();
            this.receiptDeleted = true;
        }
    },

    RejectMR: function (btn) {
        var path = $(btn).data('path');
        var id = $(btn).data('delete-id');
        if (confirm("Are you sure you want to reject this MR?")) {
            console.log("Rejecting ID: " + id + " via " + path);
        }
    },

    SaveAndSyncMaterial: function (mrId) {
        var itemsList = [];
        var isValid = true;

        $("#PRInventoryItems tr").each(function () {
            var row = $(this);
            var invId = row.find('input[type="hidden"].hdnInventoryId').val() || row.find('input[name*="InventoryId"]').val();
            var qty = row.find(".txtQty").val();
            var lot = row.find(".txtLotNumber").val();
            var expiry = row.find(".txtExpiryDate").val();

            if (invId && invId !== "0") {
                if (!qty || parseInt(qty) <= 0) {
                    alert("Please enter a valid quantity.");
                    isValid = false; return false;
                }
                itemsList.push({
                    InventoryId: parseInt(invId),
                    BatchNumber: lot || "",
                    ExpiryDate: expiry || "",
                    Quantity: parseInt(qty)
                });
            }
        });

        if (!isValid || itemsList.length === 0) return;

        if (confirm("Update details and synchronize with Purchase Invoice?")) {
            $("#purchase-request--loader").show();

            var formData = new FormData();
            formData.append("MaterialReceivingId", mrId);
            formData.append("ItemsJson", JSON.stringify(itemsList));

            var centerId = $("#Center").val() || $("#CenterID").val() || 0;
            formData.append("CenterID", centerId);

            var fileInput = document.getElementById('newReceiptFile');
            if (fileInput && fileInput.files.length > 0) {
                formData.append("ReceiptFile", fileInput.files[0]);
            }

            $.ajax({
                type: "POST",
                url: "/MaterialReceiving/UpdateAndSyncInvoice",
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    $("#purchase-request--loader").hide();
                    if (response.success) {
                        alert(response.message);
                        location.reload();
                    } else {
                        alert("Error: " + response.message);
                    }
                },
                error: function () {
                    $("#purchase-request--loader").hide();
                    alert("Network communication error.");
                }
            });
        }
    }
};

DtPickerOption = {
    format: 'DD-MMM-YYYY',
    useCurrent: false,
    widgetParent: 'body',
    widgetPositioning: {
        horizontal: 'auto',
        vertical: 'bottom'
    }
};

function formatDate(ymd) {
    if (!/^\d{6}$/.test(ymd)) return "";
    const yy = `20${ymd.slice(0, 2)}`;
    const mm = parseInt(ymd.slice(2, 4), 10) - 1;
    const dd = ymd.slice(4, 6);
    const date = new Date(yy, mm, dd);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function addTableRow(item, key) {
    const row = document.createElement("tr");
    row.setAttribute("data-key", key);

    const productCodeInput = item.productCode
        ? `<span>${item.productCode}</span>`
        : `<input type="text" class="form-control productCodeInput" placeholder="Enter Product Code" />`;

    const lotInput = item.lotNumber
        ? `<span>${item.lotNumber}</span>`
        : `<input type="text" class="form-control lot-input" placeholder="Enter Lot No" />`;

    const expiryInput = item.expiryDate
        ? `<span>${item.expiryDate}</span>`
        : `<input type="date" class="form-control expiryDateInput datepicker width-140" name="expiryDate" />`;

    const manuInput = item.manuDate
        ? `<span>${item.manuDate}</span>`
        : `<input type="date" class="form-control manuDateInput datepicker width-140" name="manufacturingDate" />`;

    row.innerHTML = `
        <td>${item.inventoryName}</td>
        <td>${productCodeInput}</td>
        <td>${lotInput}</td>
        <td>${expiryInput}</td>
        <td>${manuInput}</td>
        <td>
            <input type="number" class="form-control quantity-input" value="${item.quantity}" min="1" style="width:90px;" />
        </td>
        <td>
            <button type="button" class="cs_frm_btn remove-row" title="Remove">
                <span class="fa fa-times text-danger"></span>
            </button>
        </td>
    `;

    tableBody.appendChild(row);

    row.querySelector('.remove-row').addEventListener('click', function () {
        const submitButton = document.querySelector("#btnSave");
        delete scannedItems[key];
        row.remove();

        const remainingRows = document.querySelectorAll("#scanTableBody tr");
        if (remainingRows.length === 0) {
            SelectedPOId = 0;
            document.getElementById('SelectedPOId').value = '0';
            document.querySelectorAll("#poTableBody input[type=checkbox]").forEach(cb => {
                cb.checked = false;
            });
        }

        submitButton.disabled = false;
        submitButton.classList.remove("disabled");
    });
}

function updateTableRow(key) {
    const row = tableBody.querySelector(`tr[data-key='${key}']`);
    if (row) {
        row.querySelector(".quantity").textContent = scannedItems[key].quantity;
    }
}

function showMessage(message, isError = false) {
    const scanInfo = document.getElementById("scanInfo");
    scanInfo.innerHTML = `<span class='${isError ? "text-danger" : "text-success"}'>${message}</span>`;
}

const btnClear = document.getElementById("btnClear");
if (btnClear) {
    btnClear.addEventListener("click", function () {
        tableBody.innerHTML = "";
        for (let key in scannedItems) delete scannedItems[key];
        rawOutputBox.value = "";
        rawOutputBox.focus();
        document.querySelectorAll("#manualRowsContainer tr[id^='manual_row_']").forEach(row => {
            row.remove();
        });
    });
}

function parseFlexibleDate(rawDate) {
    if (!rawDate) return null;
    rawDate = rawDate.trim();

    // YYMMDD
    if (/^\d{6}$/.test(rawDate)) {
        const yy = `20${rawDate.slice(0, 2)}`;
        const mm = parseInt(rawDate.slice(2, 4), 10) - 1;
        const dd = rawDate.slice(4, 6);
        const date = new Date(yy, mm, dd);
        if (isValidDate(date)) return { type: 'full', date };
    }

    // ✅ MM/YYYY or MM-YYYY
    const monthYearMatch = rawDate.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (monthYearMatch) {
        const month = parseInt(monthYearMatch[1], 10) - 1;
        const year = parseInt(monthYearMatch[2], 10);
        const date = new Date(year, month, 1);
        if (isValidDate(date)) return { type: 'monthYear', date };
    }

    // ✅ DD/MM/YYYY or DD-MM-YYYY
    const fullDateMatch = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (fullDateMatch) {
        const day = parseInt(fullDateMatch[1], 10);
        const month = parseInt(fullDateMatch[2], 10) - 1;
        const year = parseInt(fullDateMatch[3], 10);
        const date = new Date(year, month, day);
        if (isValidDate(date)) return { type: 'full', date };
    }

    // JS native fallback
    const parsed = Date.parse(rawDate);
    if (!isNaN(parsed)) return { type: 'full', date: new Date(parsed) };

    return null;
}
function formatParsedDate(dateObj) {
    if (!dateObj) return "";
    const day = String(dateObj.date.getDate()).padStart(2, '0');
    const month = dateObj.date.toLocaleString('default', { month: 'short' });
    const year = dateObj.date.getFullYear();
    if (dateObj.type === 'full') {
        return `${day}-${month}-${year}`;
    } else if (dateObj.type === 'monthYear') {
        return `${month}-${year}`;
    }
    return "";
}

function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

function parseFlexibleDateToDateTime(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    const dmyMatch = dateStr.match(/^(\d{2})-(\w{3})-(\d{4})$/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1]);
        const monthStr = dmyMatch[2];
        const year = parseInt(dmyMatch[3]);
        const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
        return new Date(year, monthIndex, day);
    }

    const monthYearRegex = /^(\d{2}|\w{3})-(\d{4})$/;
    const match = dateStr.match(monthYearRegex);
    if (match) {
        let [_, month, year] = match;
        let monthIndex = isNaN(month)
            ? new Date(`${month} 1, ${year}`).getMonth()
            : parseInt(month, 10) - 1;
        return new Date(year, monthIndex + 1, 0);
    }

    return null;
}

document.addEventListener("DOMContentLoaded", () => {
    if (rawOutputBox) rawOutputBox.focus();
    manualRowTemplate = document.getElementById('manual_row_template');
    var centerEl = document.getElementById("Center");
    var centerId = centerEl ? centerEl.value : null;
    if (centerId) {
        loadInventories(centerId);
        loadPOs(centerId);
    }
    document.getElementById('manualRowsContainer').addEventListener('click', function (e) {
        const submitButton = document.querySelector("#btnSave");
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const row = button.closest('.manual-row');
        if (!row) return;

        if (action === 'add') {
            addNextManualRow(row.id);
        } else if (action === 'remove') {
            row.remove();
            submitButton.disabled = false;
            submitButton.classList.remove("disabled");
        }
    });
});

if (rawOutputBox) {
    rawOutputBox.addEventListener("blur", function () {
        setTimeout(() => {
            const active = document.activeElement;
            if (
                active &&
                active.tagName !== "SELECT" &&
                active.tagName !== "INPUT" &&
                active.tagName !== "TEXTAREA" &&
                !active.classList.contains("custom-dropdown")
            ) {
                rawOutputBox.focus();
            }
        }, 100);
    });

    rawOutputBox.addEventListener("focus", function () {
        this.select();
    });
}

let scanDebounce = null;
if (rawOutputBox) {
    rawOutputBox.addEventListener("input", function () {
        clearTimeout(scanDebounce);
        scanDebounce = setTimeout(() => {
            const rawValue = rawOutputBox.value;
            const lines = rawValue.replace(/\r\n|\r/g, "\n").split("\n");
            const lastLine = lines[lines.length - 1].trim();
            if (lastLine.length > 3) {
                splitScannedText(lastLine);
            }
        }, 500);
    });

    // ✅ Trigger on Enter key immediately
    rawOutputBox.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            clearTimeout(scanDebounce);
            const rawValue = rawOutputBox.value;
            const lines = rawValue.replace(/\r\n|\r/g, "\n").split("\n");
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.length > 3) {
                    splitScannedText(line);
                    break;
                }
            }
        }
    });
}
function splitScannedText(scannedText) {
    let productCode = "", expiryRaw = "", manuRaw = "", lotNumber = "";

    const isGS1 = scannedText.startsWith("01") && scannedText.length >= 16;

    if (isGS1) {
        try {
            const markerMap = {};
            let currentIndex = 0;
            let safetyLimit = 0;

            while (currentIndex < scannedText.length && safetyLimit < 20) {
                safetyLimit++;
                const id = scannedText.substr(currentIndex, 2);
                currentIndex += 2;

                let length = 0;
                if (id === "01") length = 14;
                else if (id === "17") length = 6;
                else if (id === "11") length = 6;
                else if (id === "10") {
                    markerMap[id] = scannedText.substr(currentIndex).trim();
                    break;
                } else {
                    console.warn('Unknown GS1 AI:', id);
                    break;
                }

                markerMap[id] = scannedText.substr(currentIndex, length).trim();
                currentIndex += length;
            }

            productCode = markerMap["01"] || "";
            expiryRaw = markerMap["17"] || "";
            manuRaw = markerMap["11"] || "";
            lotNumber = markerMap["10"] || "";

        } catch (err) {
            showMessage("❌ Error parsing GS1 format.", true);
            rawOutputBox.value = "";
            rawOutputBox.focus();
            return;
        }

    } else if (scannedText.includes(":")) {
        // Format: ProductCode*LotNumber : SomeCode*ManuDate*ExpiryDate
        const colonIdx = scannedText.indexOf(":");
        const left = scannedText.substring(0, colonIdx).trim();
        const right = scannedText.substring(colonIdx + 1).trim();

        const leftParts = left.split("*");
        const rightParts = right.split("*");

        productCode = leftParts[0]?.trim() || "";
        lotNumber = leftParts[1]?.trim() || "";
        manuRaw = rightParts[1]?.trim() || "";
        expiryRaw = rightParts[2]?.trim() || "";

        console.log('✅ Colon format parsed:', { productCode, lotNumber, manuRaw, expiryRaw });

    } else if (/^\d{12,14}$/.test(scannedText)) {
        productCode = scannedText.trim();

    } else if (scannedText.includes("*")) {
        // Format: ProductCode*LotNumber
        const parts = scannedText.split("*");
        productCode = parts[0]?.trim() || "";
        lotNumber = parts[1]?.trim() || "";
        manuRaw = parts[2]?.trim() || "";
        expiryRaw = parts[3]?.trim() || "";

        console.log('✅ Star format parsed:', { productCode, lotNumber, manuRaw, expiryRaw });

    } else {
        productCode = scannedText.trim();
        console.log('ℹ️ Fallback product code:', productCode);
    }

    if (!productCode) {
        showMessage("❌ Could not parse barcode.", true);
        rawOutputBox.value = "";
        rawOutputBox.focus();
        return;
    }

    const expiryDateObj = parseFlexibleDate(expiryRaw);
    const manuDateObj = parseFlexibleDate(manuRaw);
    const expiryDate = formatParsedDate(expiryDateObj);
    const manuDate = formatParsedDate(manuDateObj);
    const key = `${productCode.trim()}_${lotNumber.trim()}`;

    console.log('🔑 Key:', key, '| ProductCode:', productCode, '| Lot:', lotNumber);

    if (scannedItems[key]) {
        if (Date.now() - (scannedItems[key]._lastScan || 0) < 1000) {
            rawOutputBox.value = "";
            rawOutputBox.focus();
            return;
        }
        scannedItems[key].quantity += 1;
        scannedItems[key]._lastScan = Date.now();
        updateTableRow(key);
        rawOutputBox.value = "";
        rawOutputBox.focus();

    } else {
        fetch(`/MaterialReceiving/GetInventoryDetails?productCode=${encodeURIComponent(productCode)}`)
            .then(res => res.json())
            .then(data => {
                console.log('📦 API response:', data);

                // ✅ Handle both field name casings from API
                const inventoryName = data.inventoryName || data.InventoryName || "Not Found";
                //const inventoryId = String(data.inventoryItemId || data.InventoryItemId || data.inventoryId || data.InventoryId || "0");
                const inventoryId = String(
                    data.inventoryItemId ??
                    data.InventoryItemId ??
                    data.inventoryId ??
                    data.InventoryId ??
                    "0"
                );
                console.log('✅ Resolved inventoryId:', inventoryId);
                console.log('✅ Resolved inventoryId:', inventoryId, '| inventoryName:', inventoryName);

                const centerId = document.getElementById("Center").value;

                scannedItems[key] = {
                    productCode, lotNumber, expiryDate, manuDate,
                    inventoryName, inventoryId, centerId,
                    quantity: 1, _lastScan: Date.now()
                };

                addTableRow(scannedItems[key], key);

                const submitButton = document.querySelector("#btnSave");

                if (inventoryId !== "0") {
                    const matchingRows = [];
                    document.querySelectorAll("#poTableBody tr").forEach(row => {
                        const hiddenInput = row.querySelector("input.inventory-ids");
                        if (!hiddenInput) return;

                        // ✅ Force string comparison on both sides
                        const rowInventoryIds = hiddenInput.value.toString().trim()
                            .split(',')
                            .map(x => x.trim())
                            .filter(x => x !== "");

                        if (rowInventoryIds.map(String).includes(String(inventoryId))) {
                            matchingRows.push(row);
                        }
                    });

                    console.log('🔍 Matching PO rows found:', matchingRows.length);

                    if (matchingRows.length === 1) {
                        const checkbox = matchingRows[0].querySelector("input[type=checkbox]");
                        if (checkbox) {
                            checkbox.checked = true;
                            const selectedPOId = parseInt(checkbox.getAttribute('data-poid')) || 0;
                            document.getElementById('SelectedPOId').value = String(selectedPOId);
                            console.log('✅ PO auto-selected. POID:', selectedPOId);
                        }
                    } else if (matchingRows.length > 1) {
                        showPoMessage(`${inventoryName} exists in more than 1 PR. Please select manually.`);
                    } else {
                        showPoMessage(`${inventoryName} not found in PO/PR list.`);
                    }
                } else {
                    submitButton.disabled = true;
                    submitButton.classList.add("disabled");
                    toastr.error("This item does not exist in the Purchase Order.");
                }

                rawOutputBox.value = "";
                rawOutputBox.focus();
            })
            .catch(err => {
                console.error("Fetch error:", err);
                showMessage("❌ Error fetching inventory details.", true);
                rawOutputBox.value = "";
                rawOutputBox.focus();
            });
    }
}
Dropzone.autoDiscover = false;

function initializeDatePickers(row) {
    if (typeof $ === 'undefined' || typeof $.fn.datepicker === 'undefined') return;
    $('.bts_dttime_picker').datepicker({
        format: 'dd-M-yy',
        autoclose: true,
        todayHighlight: true
    });
}

// ============================================================
// DROPZONE INIT — FILE UPLOAD MANDATORY FIX IS HERE
// ============================================================
$(document).ready(function () {
    initializeDatePickers();

    // ✅ Wait for Dropzone to be available
    function initMyDropzone() {
        if (typeof Dropzone === 'undefined') {
            setTimeout(initMyDropzone, 100);
            return;
        }

        Dropzone.autoDiscover = false;

        var myDropzone = new Dropzone("#dropzoneJsForm", {
            parallelUploads: 3,
            acceptedFiles: '.csv,.xls,.xlsx,.pdf,.msg',
            dictDefaultMessage: "Drag or click here to upload",
            maxFilesize: 25,
            autoProcessQueue: true,
            url: '/Common/Upload',
            addRemoveLinks: true,
            dictInvalidFileType: 'Only csv, xls, xlsx, msg and pdf formats are allowed',

            init: function () {
                this.on("maxfilesexceeded", function (file) {
                    this.removeFile(file);
                });

                this.on("addedfile", function (file) {
                    if (this.files.length > 1) {
                        this.removeFile(this.files[0]);
                    }
                });

                this.on("success", function (file, response) {
                    if (response.errorMsg && response.errorMsg !== "") {
                        toastr.error(response.errorMsg);
                        return;
                    }
                    const fileData = JSON.parse(response.fileJsonResponse);
                    uploadedFileMetaList = [];
                    uploadedFileMetaList.push({
                        FileName: fileData[0].FileName,
                        GUIDFileName: response.guidFileName,
                        FilePath: response.savePath
                    });
                    const wrapper = document.querySelector('.sec_box_shadow');
                    if (wrapper) wrapper.style.border = '';
                    // ✅ LOG to confirm file is registered
                    console.log("File uploaded. uploadedFileMetaList:", uploadedFileMetaList);
                    toastr.success(`${fileData[0].FileName} uploaded`);
                });

                // ✅ Clear list when file removed
                this.on("removedfile", function (file) {
                    uploadedFileMetaList = [];
                    console.log("File removed. uploadedFileMetaList cleared.");
                });
            }
        });

        window.myDropzoneInstance = myDropzone;
        console.log("Dropzone initialized. Instance saved to window.myDropzoneInstance");

        // ✅ Add mandatory label above dropzone
        const dropzoneWrapper = document.querySelector('.sec_box_shadow');
        if (dropzoneWrapper) {
            const mandatoryLabel = document.createElement('label');
            mandatoryLabel.className = 'control-label fw-semibold d-block mb-1 mt-2';
            mandatoryLabel.innerHTML = 'Invoice File <span style="color:red; font-size:16px;">*</span> <small class="text-muted">(Required)</small>';
            dropzoneWrapper.parentElement.insertBefore(mandatoryLabel, dropzoneWrapper);
        }
    }

    initMyDropzone();
});
function populateDropdown(dropdown, inventoryList) {
    dropdown.innerHTML = '<option value="">Please Select</option>';
    inventoryList.forEach(item => {
        const option = document.createElement('option');
        option.value = item.InventoryId;
        option.text = item.InventoryName;
        dropdown.appendChild(option);
    });
}

$(document).on('change', '#Center', function () {
    const centerId = this.value;
    if (!centerId) return;
    SelectedPOId = 0;
    document.getElementById('SelectedPOId').value = '0';
    loadExpiryConfig(centerId);
    loadInventories(centerId);
    loadPOs(centerId);
});

$(document).ready(function () {
    let isVisible = false;
    const wrapper = $("#instructionWrapper");
    const toggleIcon = $("#toggleInstructions");
    const header = $("#instructionHeader");

    function toggleInstructions() {
        if (isVisible) {
            wrapper.css("max-height", "0");
            toggleIcon.css("transform", "rotate(0deg)");
        } else {
            wrapper.css("max-height", "500px");
            toggleIcon.css("transform", "rotate(180deg)");
        }
        isVisible = !isVisible;
    }

    toggleIcon.on("click", function (e) {
        e.stopPropagation();
        toggleInstructions();
    });

    header.on("click", function () {
        toggleInstructions();
    });
});

function loadInventories(centerId) {
    fetch(`/MaterialReceiving/GetInventoryListByCenter?centerId=${centerId}`)
        .then(res => res.json())
        .then(data => {
            inventoryList = data || [];
            document.getElementById('manualRowsContainer').innerHTML = '';
            addNextManualRow();
        })
        .catch(err => {
            console.error("Inventory fetch failed:", err);
            toastr.error("Failed to load inventory for selected center.");
        });
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function loadPOs(centerId) {
    const tbody = document.getElementById('poTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    fetch(`/MaterialReceiving/GetApprovedPOWithInventoriesByCenter?centerId=${centerId}`)
        .then(res => res.json())
        .then(rows => {
            if (!rows || rows.error) {
                tbody.innerHTML = '<tr><td colspan="4">No data</td></tr>';
                return;
            }
            tbody.innerHTML = '';

            rows.forEach(r => {
                const tr = document.createElement('tr');
                const idList = (r.inventoryIds || "").toString()
                    .split(',').map(x => x.trim()).filter(x => x !== "");
                const rawInventories = (r.inventories || "").toString();
                const itemSegments = splitInventoryString(rawInventories);

                const parsedInventories = idList.map((id, index) => {
                    const segment = (itemSegments[index] || "").trim();
                    const lastQtyMatch = segment.match(/^(.*)\((\d+)\)\s*$/);
                    let inventoryName = segment;
                    let qty = 1;
                    if (lastQtyMatch) {
                        inventoryName = lastQtyMatch[1].trim();
                        qty = parseInt(lastQtyMatch[2], 10) || 1;
                    }
                    if (!inventoryName) {
                        const match = inventoryList.find(i => String(i.inventoryItemId) === String(id));
                        inventoryName = match ? match.name : `Inventory #${id}`;
                    }
                    return { inventoryId: id, inventoryName: inventoryName, quantity: qty };
                });

                const invData = JSON.stringify(parsedInventories);

                tr.innerHTML = `
                    <td>
                        <input type="checkbox" class="po-select" data-poid="${r.poId}" />
                        <input type="hidden" class="inventory-ids" value="${idList.join(',')}" />
                        <input type="hidden" class="inventory-data" value='${escapeAttr(invData)}' />
                    </td>
                    <td>${r.prNumber || ''}</td>
                    <td>${r.poNumber || ''}</td>
                    <td>${rawInventories}</td>`;

                tbody.appendChild(tr);
            });

            tbody.querySelectorAll('.po-select').forEach(cb => {
                cb.addEventListener('change', function () {
                    if (this.checked) {
                        tbody.querySelectorAll('.po-select').forEach(other => {
                            if (other !== this) other.checked = false;
                        });

                        SelectedPOId = parseInt(this.getAttribute('data-poid')) || 0;
                        document.getElementById('SelectedPOId').value = String(SelectedPOId);

                        const row = this.closest("tr");
                        const tableBody = document.getElementById("scanTableBody");
                        tableBody.innerHTML = "";

                        let inventoryDataList = [];
                        try {
                            inventoryDataList = JSON.parse(row.querySelector(".inventory-data").value) || [];
                        } catch (e) {
                            console.warn("Failed to parse inventory-data JSON", e);
                        }

                        inventoryDataList.forEach(item => {
                            const invId = String(item.inventoryId).trim();
                            const qty = (item.quantity > 0) ? item.quantity : 1;
                            let nameText = item.inventoryName || "";
                            if (!nameText) {
                                const match = inventoryList.find(i => String(i.inventoryItemId) === invId);
                                nameText = match ? match.name : `Inventory #${invId}`;
                            }
                            const key = invId + "_PO";
                            scannedItems[key] = {
                                inventoryId: invId, inventoryName: nameText,
                                productCode: "", lotNumber: "", expiryDate: "",
                                manuDate: "", quantity: qty
                            };
                            if (typeof addTableRow === "function") {
                                addTableRow(scannedItems[key], key);
                            }
                        });
                    } else {
                        SelectedPOId = 0;
                        document.getElementById('SelectedPOId').value = '0';
                        document.getElementById("scanTableBody").innerHTML = "";
                        scannedItems = {};
                    }
                });
            });
        })
        .catch(err => {
            console.error('PO fetch failed:', err);
            tbody.innerHTML = '<tr><td colspan="4">Failed to load</td></tr>';
        });
}

function splitInventoryString(raw) {
    if (!raw) return [];
    const segments = [];
    const parts = raw.split(/\)\s*,\s*(?=[A-Z0-9])/);
    parts.forEach((part, i) => {
        if (i < parts.length - 1) {
            segments.push(part + ")");
        } else {
            segments.push(part);
        }
    });
    return segments;
}

function escapeAttr(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;');
}

function getSelectedInventoryIds() {
    return $('#manualRowsContainer .inventory-dropdown')
        .map(function () { return $(this).val(); })
        .get()
        .filter(v => v)
        .map(String);
}

function refreshAllInventoryDropdowns() {
    const selectedIds = getSelectedInventoryIds();
    $('#manualRowsContainer .inventory-dropdown').each(function () {
        const $select = $(this);
        const currentVal = $select.val() ? String($select.val()) : '';
        $select.empty().append('<option value="">Select Inventory</option>');
        inventoryList.forEach(item => {
            const idStr = String(item.inventoryItemId);
            const selectedAttr = (idStr === currentVal) ? ' selected' : '';
            $select.append(`<option value="${idStr}"${selectedAttr}>${item.name}</option>`);
        });
        if ($select.hasClass('select2-hidden-accessible')) {
            try { $select.select2('destroy'); } catch (e) { }
            $select.select2({ placeholder: "Select Inventory", width: '100%' });
        }
    });
}

function formatToIso(dateStr) {
    if (!dateStr) return null;
    let d = parseFlexibleDateToDateTime(dateStr);
    if (!d || isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
}

$(document).on('change', '.inventory-dropdown', refreshAllInventoryDropdowns);

$(document).on('click', '.remove-row-btn', function () {
    $(this).closest('.manual-row').remove();
    refreshAllInventoryDropdowns();
});

$(document).on('change', '#manualRowsContainer .inventory-dropdown', function () {
    const selectedInventoryIds = getSelectedInventoryIds();
    const tbody = document.getElementById("poTableBody");
    const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
    const poMessage = $("#poMessage");
    const submitButton = document.querySelector("#btnSave");
    poMessage.hide();
    const anyPOChecked = document.querySelector('.po-select:checked');
    if (!anyPOChecked) {
        poMessage
            .removeClass()
            .addClass("alert alert-warning")
            .html("<b>⚠️ No PO selected.</b> Please select a Purchase Order from the table above before submitting.")
            .fadeIn();
    }

    selectedInventoryIds.forEach(invId => {
        const inventoryName = $(`#manualRowsContainer .inventory-dropdown option[value='${invId}']`).text().trim() || "This inventory";
        const matchingRows = rows.filter(row => {
            const inventoryIdsStr = row.querySelector(".inventory-ids")?.value || "";
            const rowInventoryIds = inventoryIdsStr.split(',').map(id => id.trim()).filter(Boolean);
            return rowInventoryIds.includes(invId);
        });
        if (matchingRows.length === 1) {
            const checkbox = matchingRows[0].querySelector("input[type=checkbox]");
            if (checkbox) {
                checkbox.checked = true;
                const SelectedPOId = parseInt(checkbox.getAttribute("data-poid")) || 0;
                document.getElementById("SelectedPOId").value = String(SelectedPOId);
            } else {
                document.getElementById("SelectedPOId").value = "0";
            }
            checkbox.addEventListener("change", () => {
                if (!checkbox.checked) poMessage.fadeOut();
            });
        } else if (matchingRows.length > 1) {
            poMessage
                .addClass("alert alert-info")
                .html(`<b>${inventoryName}</b> exists in more than 1 PR. Please select manually.`)
                .fadeIn();
            matchingRows.forEach(row => {
                const checkbox = row.querySelector("input[type=checkbox]");
                checkbox.addEventListener("change", () => {
                    if (checkbox.checked) poMessage.fadeOut();
                });
            });
        } else {
            poMessage
                .addClass("alert alert-info")
                .html(`<b>${inventoryName}</b> not found in PO/PR list.`)
                .fadeIn();
            submitButton.disabled = true;
            submitButton.classList.add("disabled");
            toastr.error("This item does not exist in the Purchase Order.");
        }
    });
});

function addNextManualRow(currentRowId = null) {
    if (currentRowId) {
        const currentRow = document.getElementById(currentRowId);
        const inventoryId = currentRow.querySelector("select[name='inventoryId']").value;
        const quantity = currentRow.querySelector("input[name='quantity']").value;
        if (!inventoryId || !quantity) {
            toastr.error("Please fill Inventory and Quantity before adding a new row.");
            return;
        }
    }

    if (!manualRowTemplate) {
        console.error("manualRowTemplate is not initialized.");
        return;
    }

    const newRow = manualRowTemplate.cloneNode(true);
    const newId = 'manual_row_' + Date.now();
    newRow.id = newId;
    newRow.style.display = '';
    $(newRow).find("input, select").val('');

    const $dropdown = $(newRow).find('.inventory-dropdown');
    $dropdown.empty().append('<option value="">Select Inventory</option>').addClass('drp-multiselect');

    inventoryList.forEach(item => {
        $dropdown.append(`<option value="${item.inventoryItemId}">${item.name}</option>`);
    });

    $dropdown.select2({ placeholder: "Select Inventory", width: '100%' });
    $(newRow).find('select.drp-multiselect').css({
        'appearance': 'none', '-webkit-appearance': 'none',
        '-moz-appearance': 'none', 'background': 'transparent'
    });

    $('#manualRowsContainer').append(newRow);
    refreshAllInventoryDropdowns();
}

document.getElementById("btnClear").addEventListener("click", function () {
    tableBody.innerHTML = "";
    for (let key in scannedItems) delete scannedItems[key];
    rawOutputBox.value = "";
    rawOutputBox.focus();
    document.querySelectorAll("#manualRowsContainer tr[id^='manual_row_']").forEach(row => {
        row.remove();
    });
});

function removeRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
}

function showPoMessage(message) {
    const msgBox = document.getElementById("poMessage");
    msgBox.className = "alert alert-info";
    msgBox.style.display = "block";
    msgBox.textContent = message;
}

function hidePoMessage() {
    const msgBox = document.getElementById("poMessage");
    msgBox.style.display = "none";
    msgBox.textContent = "";
}

document.addEventListener("change", function (e) {
    if (e.target && e.target.matches("#poTableBody input[type=checkbox]")) {
        if (e.target.checked) {
            hidePoMessage();
        }
    }
});

// ============================================================
// FILE UPLOAD CHECK FUNCTION
// ============================================================
function hasUploadedFile() {
    if (!uploadedFileMetaList || uploadedFileMetaList.length === 0) {
        return false;
    }
    if (window.myDropzoneInstance) {
        const successFiles = window.myDropzoneInstance.files.filter(f => f.status === 'success');
        if (successFiles.length === 0) return false;
    }
    return true;
}

function showFileRequiredError(btn) {
    const wrapper = document.querySelector('.sec_box_shadow');
    if (wrapper) {
        wrapper.style.border = '2px solid red';
        wrapper.style.borderRadius = '4px';
        setTimeout(() => {
            wrapper.style.border = '';
            wrapper.style.borderRadius = '';
        }, 3000);
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    Swal.fire({
        icon: 'warning',
        title: 'Invoice File Required',
        text: 'Please upload an invoice file before submitting.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
    }).then(() => { btn.disabled = false; });
}

// ============================================================
// BTN SAVE HANDLER
// ============================================================
$("#btnSave").off("click");
let isSubmitting = false;

$("#btnSave").on("click", function (e) {
    e.preventDefault();
    if (isSubmitting) return;
    debugger;
    console.log("uploadedFileMetaList:", uploadedFileMetaList);
    console.log("uploadedFileMetaList length:", uploadedFileMetaList.length);
    if (window.myDropzoneInstance) {
        console.log("Dropzone files:", window.myDropzoneInstance.files);
        console.log("Success files:", window.myDropzoneInstance.files.filter(f => f.status === 'success'));
    } else {
        console.log("myDropzoneInstance is NULL");
    }

    var btn = this;
    var centerId = document.getElementById("Center").value;

    if (!centerId) {
        toastr.error("Please select a center.");
        return;
    }

    btn.disabled = true;

    // Get PO ID
    let poidValue = null;
    const checkedRadio = document.querySelector('#poTableBody input[type=radio]:checked');
    if (checkedRadio) poidValue = checkedRadio.value;

    if (!poidValue) {
        const checkedCheckbox = document.querySelector('.po-select:checked');
        if (checkedCheckbox) poidValue = checkedCheckbox.getAttribute('data-poid');
    }

    if (!poidValue || poidValue === '0') {
        const hiddenPOId = document.getElementById('SelectedPOId').value;
        if (hiddenPOId && hiddenPOId !== '0') poidValue = hiddenPOId;
    }

    if (!poidValue || parseInt(poidValue) === 0) {
        toastr.error("Please select a Purchase Order before submitting.");
        btn.disabled = false;
        return;
    }

    // Build submission
    const submission = {
        CenterID: parseInt(centerId),
        POID: parseInt(poidValue),
        Fileupload: uploadedFileMetaList.length > 0 ? JSON.stringify([uploadedFileMetaList[0]]) : null,
        Items: []
    };

    function formatToSqlDate(val) {
        if (!val) return null;
        const d = parseFlexibleDateToDateTime(val);
        if (!d || isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Collect scanned items
    document.querySelectorAll("#scanTableBody tr").forEach(row => {
        const key = row.getAttribute("data-key");
        const item = scannedItems[key];
        if (!item) return;
        const qtyInput = row.querySelector(".quantity-input");
        const lotInput = row.querySelector("input[name='lotNumber']") || row.querySelector("input[placeholder*='Lot']");
        const expiryInput = row.querySelector(".expiryDateInput");
        const manuInput = row.querySelector(".manuDateInput");
        submission.Items.push({
            InventoryId: parseInt(item.inventoryId),
            ProductCode: item.productCode || "NA",
            BatchNumber: (lotInput && lotInput.value.trim() !== "") ? lotInput.value : (item.lotNumber || "NA"),
            ExpiryDate: formatToSqlDate(expiryInput?.value || item.expiryDate),
            ManufacturingDate: formatToSqlDate(manuInput?.value || item.manuDate),
            Quantity: qtyInput ? parseInt(qtyInput.value) : item.quantity,
            MaterialReceivingId: 0
        });
    });

    // Collect manual items
    document.querySelectorAll("#manualRowsContainer tr[id^='manual_row_']").forEach(row => {
        if (row.style.display === 'none') return;
        const inventoryId = row.querySelector("select[name='inventoryId']").value;
        const quantity = row.querySelector("input[name='quantity']").value;
        const productCodeVal = row.querySelector("input[name='productCode']").value;
        const batchNumberVal = row.querySelector("input[name='lotNumber']").value;
        const expiryDateVal = row.querySelector("input[name='expiryDate']").value;
        const manuDateVal = row.querySelector("input[name='manufacturingDate']").value;
        if (inventoryId && quantity) {
            submission.Items.push({
                InventoryId: parseInt(inventoryId),
                ProductCode: productCodeVal.trim() !== "" ? productCodeVal : "NA",
                BatchNumber: batchNumberVal.trim() !== "" ? batchNumberVal : "NA",
                ExpiryDate: formatToSqlDate(expiryDateVal),
                ManufacturingDate: formatToSqlDate(manuDateVal),
                Quantity: parseInt(quantity),
                MaterialReceivingId: 0
            });
        }
    });

    if (submission.Items.length === 0) {
        toastr.error("No valid items to save.");
        btn.disabled = false;
        return;
    }

    // Expiry validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDays = expiryConfig.warningDays ?? 60;
    const blockDays = expiryConfig.blockDays ?? 0;
    const warningCutoff = new Date(today);
    warningCutoff.setDate(today.getDate() + warningDays);
    const blockCutoff = new Date(today);
    blockCutoff.setDate(today.getDate() + blockDays);

    const expiredItems = [];
    const blockedItems = [];
    const nearExpiryItems = [];

    function checkExpiryDate(expiryVal, itemName) {
        if (!expiryVal) return;
        const expiryDate = parseFlexibleDateToDateTime(expiryVal);
        if (!expiryDate) return;
        const formatted = expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        if (expiryDate < today) {
            expiredItems.push(`• ${itemName} (Expired: ${formatted})`);
        } else if (blockDays > 0 && expiryDate < blockCutoff) {
            blockedItems.push(`• ${itemName} (Expires: ${formatted})`);
        } else if (warningDays > 0 && expiryDate < warningCutoff) {
            nearExpiryItems.push(`• ${itemName} (Expires: ${formatted})`);
        }
    }

    submission.Items.forEach(item => {
        const invName = inventoryList.find(i => i.inventoryItemId === item.InventoryId)?.name || "Unknown Item";
        checkExpiryDate(item.ExpiryDate, invName);
    });

    if (expiredItems.length > 0) {
        Swal.fire({
            icon: 'error', title: 'Expired Items Found!',
            html: `<div style="text-align:left">The following items are already <b>EXPIRED</b>:<br/><br/>${expiredItems.join('<br/>')}<br/><br/>Please remove or correct them.</div>`,
            confirmButtonText: 'OK', confirmButtonColor: '#d33'
        }).then(() => { btn.disabled = false; });
        return;
    }

    if (blockedItems.length > 0) {
        Swal.fire({
            icon: 'error', title: 'Items Too Close to Expiry!',
            html: blockedItems.join('<br/>') + '<br/><br/>Please remove or correct them.',
            confirmButtonText: 'OK', confirmButtonColor: '#d33'
        }).then(() => { btn.disabled = false; });
        return;
    }

    if (nearExpiryItems.length > 0) {
        Swal.fire({
            icon: 'warning', title: 'Near Expiry Warning',
            html: `<div style="text-align:left">The following items expire within <b>${warningDays} days</b>:<br/><br/>${nearExpiryItems.join('<br/>')}<br/><br/>Do you want to submit?</div>`,
            showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'No',
            confirmButtonColor: '#3085d6', cancelButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                // ✅ FILE CHECK — near expiry path
                if (!hasUploadedFile()) {
                    showFileRequiredError(btn);
                    return;
                }
                sendSubmission(btn, submission);
            } else {
                btn.disabled = false;
            }
        });
        return;
    }

    // ✅ FILE CHECK — normal path
    if (!hasUploadedFile()) {
        showFileRequiredError(btn);
        return;
    }

    sendSubmission(btn, submission);
});

function sendSubmission(btn, submission) {
    fetch("/MaterialReceiving/SaveScannedItems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission)
    })
        .then(res => res.json())
        .then(result => {
            btn.disabled = false;
            if (result.success) {
                Swal.fire({
                    icon: 'success', title: 'Saved Successfully!',
                    text: 'Items have been saved.', timer: 2000, showConfirmButton: false
                }).then(() => {
                    document.getElementById("btnClear")?.click();
                    window.location.href = '/MaterialReceiving/Index';
                });
            } else {
                Swal.fire({
                    icon: 'error', title: 'Something went wrong',
                    text: result.message || 'Please try again.', confirmButtonColor: '#d33'
                });
            }
        })
        .catch(err => {
            btn.disabled = false;
            console.error("Save error:", err);
            Swal.fire({
                icon: 'error', title: 'Server Error',
                text: 'A server error occurred during save.', confirmButtonColor: '#d33'
            });
        });
}

function proceedWithSubmission(btn, submission) {
    btn.disabled = true;
    fetch("/MaterialReceiving/SaveScannedItems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission)
    })
        .then(res => res.json())
        .then(result => {
            btn.disabled = false;
            if (result.success) {
                Swal.fire({
                    icon: 'success', title: 'Saved Successfully!',
                    text: 'Items have been saved.', timer: 2000, showConfirmButton: false
                }).then(() => {
                    document.getElementById("btnClear").click();
                    window.location.href = '/MaterialReceiving/Index';
                });
            } else {
                Swal.fire({
                    icon: 'error', title: 'Something went wrong',
                    text: result.message || 'Please try again.', confirmButtonColor: '#d33'
                });
            }
        })
        .catch(err => {
            btn.disabled = false;
            console.error("Save error:", err);
            Swal.fire({
                icon: 'error', title: 'Server Error',
                text: 'A server error occurred during save.', confirmButtonColor: '#d33'
            });
        });
}