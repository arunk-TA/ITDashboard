Dropzone.autoDiscover = false;
var grnCreateDropzone;
var TempData = [];
var isObservationParam = false;
var currentApprovePIId = null;
var currentApprovePINumber = null;

var PurchaseInvoiceCreate = {
    LocationInfo: {
        centerCountryId: null,
        centerStateId: null,
        vendorCountryId: null,
        vendorStateId: null
    },
    Init: function () {
        debugger;
        var status = $(".badge-info").text().trim();

        console.log("Status detected from Header:", status);
        if (status === "Pending PI Review" || status === "PendingPIReceivedPartially") {
            console.log("Running Force Unlock for Status:", status);
            setTimeout(function () {
                console.log("Running Force Unlock for Status:", status);

                $('.Remarks').each(function () {
                    $(this).prop('readonly', false)
                        .removeAttr('readonly')
                        .prop('disabled', false)
                        .removeAttr('disabled')
                        .css({
                            "background-color": "#ffffff",
                            "pointer-events": "auto",
                            "cursor": "text"
                        });
                });

                // Also check the specific ID just in case
                $("[id^='Remarks']").prop('readonly', false).removeAttr('readonly');

            }, 1000); // 1 second delay

            // Target both class (.HSNCode) AND any ID starting with HSNCode ([id^='HSNCode'])
            $(".HSNCode, [id^='HSNCode']").each(function () {
                $(this).prop("readonly", false);
                $(this).prop("disabled", false); // Add this - crucial if field is truly 'disabled'
                $(this).removeAttr("readonly");
                $(this).removeAttr("disabled");
                $(this).removeClass("readonly disabled");
                $(this).css({
                    "background-color": "#fff",
                    "pointer-events": "auto",
                    "cursor": "text",
                    "border": "1px solid #ccc" // Ensure it looks editable
                });
            });

            // Unlock Header fields
            $("#PINumber, #InvoiceDate, #GateEntryNo, #GateEntryDate").each(function () {
                $(this).prop("readonly", false).prop("disabled", false).removeAttr("readonly").removeAttr("disabled");
                $(this).css("background-color", "#fff");
            });
        }
               
        $('#InvoiceDate').prop('readonly', false).removeAttr('readonly').removeClass('readonly disabled');
        $('#InvoiceDate').prop('disabled', false); // Ensure it's not globally disabled
        if ($.fn.datetimepicker) {
            $('.bts_dttime_picker').datetimepicker({
                format: 'DD-MMM-YYYY', // Note: some libraries use uppercase for this format
                allowInputToggle: true
            });
        }
       

        $('#PINumber').prop('readonly', false).removeAttr('readonly').removeClass('readonly');
        $('.cs_frm_btn').click(function () {
            var entityId = $(this).data('delete-id');
            var PINumber = $(this).data('delete-number');
            console.log($(this).data('delete-number'));
            $(".PIId").val(entityId);
            $('#frmDeletePurchaseInvoice').find('#PINumber').text(PINumber);
            $('#frmApprovePurchaseInvoice').find('#ApproveprNumber').text(PINumber);
            $('#frmRejectPurchaseInvoice').find('#RejectprNumber').text(PINumber);
            $('#frmPaymentPurchaseInvoice').find('#PaymentpiNumber').text(PINumber);
        });
        $('.small-btn').click(function () {
            var id = $(this).data('delete-id');
            var Number = $(this).data('delete-number');
            $(".PIId").val(id);
            $('#frmDeletePurchaseInvoice').find('#PINumber').text(Number);
            $('#frmApprovePurchaseInvoice').find('#ApproveprNumber').text(Number);
            $('#frmRejectPurchaseInvoice').find('#RejectprNumber').text(Number);
            $('#frmPaymentPurchaseInvoice').find('#PaymentpiNumber').text(Number);
        });
       

        $('#approvePI').click(function (e) {
            /*e.preventdefault();*/
            $("#approvePI").prop('disabled', true);
            PurchaseInvoiceCreate.SubmitPIForApprove();
        });
      



        // ✅ EDIT BUTTON
        $('#btnEditGateEntryDate').on('click', function () {
            var $input = $('#GateEntryDate');
            var $inputGroup = $input.closest('.input-group');

            // Re-add calendar icon if removed
            if ($inputGroup.find('.input-group-append').length === 0) {
                $inputGroup.append(
                    '<span class="input-group-append" onclick="$(\'#GateEntryDate\').focus();">' +
                    '<i class="input-group-text fa fa-calendar"></i>' +
                    '</span>'
                );
            }

            // Make editable
            $input
                .prop('readonly', false)
                .removeAttr('readonly')
                .attr('placeholder', 'Select Date')
                .addClass('bts_dttime_picker')
                .css({
                    'background-color': '#fff',
                    'border': '1px solid #ccc',
                    'color': '#495057',
                    'pointer-events': 'auto'
                });

            // Re-init datepicker
            if ($.fn.datetimepicker) {
                $input.datetimepicker({
                    format: 'DD-MMM-YYYY',
                    allowInputToggle: true
                });
            }

            // Swap buttons
            $('#btnApproveGateEntryDate').removeClass('d-none').prop('disabled', false);
            $(this).addClass('d-none');
        });

        // ✅ APPROVE BUTTON
        $('#btnApproveGateEntryDate').on('click', function () {
            var newDate = $('#GateEntryDate').val();
            var piId = $('#PurchaseInvoiceId').val();

            if (!newDate) {
                toastr.error("Please select a Gate Entry Date before approving.");
                return;
            }

            $(this).prop('disabled', true);

            $.ajax({
                url: '@Url.Action("UpdatePurchaseInvoice", "PurchaseInvoice")',
                type: 'POST',
                data: { Id: piId, GateEntryDate: newDate },
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("XSRF-TOKEN",
                        $('input:hidden[name="__RequestVerificationToken"]').val());
                },
                success: function (response) {
                    if (response === "Success") {
                        toastr.success("Gate Entry Date saved successfully.");

                        var savedDate = $('#GateEntryDate').val();

                        // Destroy datepicker
                        if ($('#GateEntryDate').data('DateTimePicker')) {
                            $('#GateEntryDate').data('DateTimePicker').destroy();
                        }

                        // Remove calendar icon
                        $('#GateEntryDate').closest('.input-group')
                            .find('.input-group-append').remove();

                        // Show as readonly same as DB saved state
                        $('#GateEntryDate')
                            .val(savedDate)
                            .prop('readonly', true)
                            .removeAttr('placeholder')
                            .removeClass('bts_dttime_picker')
                            .css({
                                'background-color': '#e9ecef',
                                'border': '1px solid #ced4da',
                                'color': '#495057',
                                'pointer-events': 'none'
                            });

                        // Swap buttons
                        $('#btnApproveGateEntryDate').addClass('d-none');
                        $('#btnEditGateEntryDate').removeClass('d-none');

                    } else {
                        toastr.error("Update failed: " + response);
                        $('#btnApproveGateEntryDate').prop('disabled', false);
                    }
                },
                error: function () {
                    toastr.error("Controller could not be reached.");
                    $('#btnApproveGateEntryDate').prop('disabled', false);
                }
            });
        });

        $('#submit').click(function () {
            PurchaseInvoiceCreate.SubmitClick();
        });
         
    },
    SubmitClick: function () {
        $('#submit').prop('disabled', true);
        if ($('#InvoiceDate').val() == null || $('#InvoiceDate').val() == undefined || $('#InvoiceDate').val() == '') {
            toastr.error("Please select invoice date");
            $('#submit').prop('disabled', false);
            return false;
        }
        if ($('#PurchaseOrderId').val() != 0 && ($('#GateEntryNo').val() == null || $('#GateEntryNo').val() == 0 || $('#GateEntryNo').val() == undefined || $('#GateEntryNo').val() == '')) {
            toastr.error("Please enter Gate Entry No");
            $('#submit').prop('disabled', false);
            return false;
        }
        if ($('#PurchaseOrderId').val() != 0 && ($('#GateEntryDate').val() == null || $('#GateEntryDate').val() == undefined || $('#GateEntryDate').val() == '')) {
            toastr.error("Please enter Gate Entry Date");
            $('#submit').prop('disabled', false);
            return false;
        }
        if ($('#PINumber').val() == null || $('#PINumber').val() == undefined || $('#PINumber').val() == '') {
            toastr.error("Please enter Invoice No");
            $('#submit').prop('disabled', false);
            return false;
        }
        var InvoiceDetailList = [];
        var IsValid;
        $('#InvoiceDetailsTable tbody tr').each(function () {
            if ($('#InventoryId', this).val() != null && $('#InventoryId', this).val() != 0) {
                if (($('.FOCType', this).val() == 'Non FOC' || $('.FOCType', this).val() == '') && ($('#PurchaseOrderNumber').val() != "" && ($('#Price', this).val() == '' || $('#Price', this).val() == 0 || $('#Price', this).val() == null || $('#Price', this).val() == undefined))) {
                    toastr.error("Please Enter Price");
                    $('#submit').attr('disabled', false);
                    isValid = false;
                    return false;
                }
                if ($('#Nature', this).val() == "Perishable" && ($('#ExpiryDate', this).val() == "" || $('#ExpiryDate', this).val() == null)) {
                    toastr.error("please select expiry date");
                    $('#submit').prop('disabled', false);
                    IsValid = false;
                    return IsValid;
                }
                if ($('#BatchNumber', this).val() == "" || $('#BatchNumber', this).val() == null) {
                    toastr.error("please enter Batch Number");
                    $('#submit').prop('disabled', false);
                    IsValid = false;
                    return IsValid;
                }
                if ($('#HSNCode', this).val() == "" || $('#HSNCode', this).val() == null) {
                    toastr.error("please enter HSE/SAC code");
                    $('#submit').prop('disabled', false);
                    IsValid = false;
                    return IsValid;
                }
                if ($('#PurchaseOrderNumber').val() != "" && ($('#RequiredQty', this).val() == "" || $('#RequiredQty', this).val() == null || $('#RequiredQty', this).val() == 0)) {
                    toastr.error("please enter Quantity more than 0");
                    $('#submit').prop('disabled', false);
                    IsValid = false;
                    return IsValid;
                }
                var PurchaseInvoiceDetail = {
                    InventoryId: parseInt($('#InventoryId', this).val()),
                    ExpiryDate: $('#ExpiryDate', this).val(),
                    BatchNumber: $('#BatchNumber', this).val(),
                    HSNCode: $('#HSNCode', this).val() == "" ? "" : parseInt($('#HSNCode', this).val()),
                    POQuantity: parseInt($('#POQty', this).text()),
                    PIQuantity: parseInt($('#RequiredQty', this).val()),
                    UOMId: parseInt($('#UOMId', this).val()),
                    Price: parseFloat($('#Price', this).val()),
                    Total: parseFloat($('#Total', this).text()),
                    Discount: $('#Discount', this).text() != null ? parseFloat($('#Discount', this).text()) : 0,
                    DiscountAmount: $('#DiscountAmount', this).text() != null ? parseFloat($('#DiscountAmount', this).text()) : 0,
                    TotalAfterDisc: $('#TotalAfterDisc', this).text() != null ? parseFloat($('#TotalAfterDisc', this).text()) : 0,
                    TaxId: parseInt($('#TaxId', this).val() > 0 ? $('#TaxId', this).val() : 0),
                    TaxCharges: $('#TaxCharges', this).text() != null ? parseFloat($('#TaxCharges', this).text()) : 0,
                    TaxAmount: $('#IGSTAmount', this).text() != null ? parseFloat($('#IGSTAmount', this).text()) : 0,
                    IGSTAmount: $('#IGSTAmount', this).text() != null ? parseFloat($('#IGSTAmount', this).text()) : 0,
                    CGSTAmount: $('#CGSTAmount', this).text() != null ? parseFloat($('#CGSTAmount', this).text()) : 0,
                    SGSTAmount: $('#SGSTAmount', this).text() != null ? parseFloat($('#SGSTAmount', this).text()) : 0,
                    NetTotal: parseFloat($('#NetTotal', this).text()),
                    Remarks: $('#Remarks', this).val(),
                    SRDescription: $('#SRDescription', this).text(),
                }
                InvoiceDetailList.push(PurchaseInvoiceDetail);
                IsValid = true;
            }
        });
        if (IsValid) {
            var FileUploadList = [];
            TempData.forEach(f => {
                var dropzoneFileName = JSON.parse(f.fileJsonResponse);
                FileUploadList.push({
                    FileName: dropzoneFileName[0].fileName,
                    GUIDFileName: f.guidFileName,
                    FilePath: f.savePath
                });
            });
            var model = {
                CountryId: $('#CountryId').val(),
                CenterId: $('#CenterId').val(),
                VendorId: $('#VendorId').val(),
                VendorBankDetailsId: $('#VendorBankDetailsId').val(),
                PurchaseRequisitionId: $('#PurchaseRequisitionId').val(),
                PurchaseRequisitionNumber: $('#PurchaseRequisitionNumber').val(),
                PurchaseOrderId: $('#PurchaseOrderId').val(),
                PurchaseOrderNumber: $('#PurchaseOrderNumber').val(),
                GRNId: $('#GRNId').val(),
                GRNNumber: $('#GRNNumber').val(),
                PurchaseInvoiceNumber: $('#PurchaseInvoiceNumber').val(),
                PINumber: $('#PINumber').val(),
                CategoryId: $('#CategoryId').val(),
                Currency: $('#Currency').val(),
                SubTotal: $('#SubTotal').html(),
                TDS: $('#TDS').val(),
                TDSAmountId: $('#TDS').val(),
                TDSAmount: Math.abs(parseFloat($('#TDSAmount').val())),
                TCS: $('#TCS').val(),
                TCSAmountId: $('#TCS').val(),
                TCSAmount: Math.abs(parseFloat($('#TCSAmount').val())),
                AdvancePaymentTDS: $('#advancePaymentTDS').val(),
                AdvancePaymentTDSAmount: $('#advancePaymentTDSAmount').val(),
                AdditionalExpesName: $('#AddCostDescription').val(),
                AddCostAmount: $('#AddCostAmount').val(),
                AddCostDescription2: $('#AddCostDescription2').attr("data-val"),
                InstallationCharges: $('#InstalltotalValue').val(),
                TransportationCharges: $('#TranstotalValue').val(),
                TotalDiscountAmount: $('#ItemDisocuntAmount').html(),
                TotalTaxAmount: $('#ItemTaxTotal').html(),
                ModeOfPayment: $('#ModeOfPayment').val(),
                PaymentDueDate: $('#PaymentDueDate').val(),
                InvoiceDate: $('#InvoiceDate').val(),
                AdvancePayPer: $("#AdvancePayPer").val(),
                AdvancePayAmt: $('#TotalAdvancePayment').val(),
                TermsAndCondition: $('#TermsAndCondition').val(),
                TotalNetTotal: $('#FinalNetTotal').text(),
                Notes: $('#Notes').val(),
                PurchaseInvoiceDetailList: InvoiceDetailList,
                FileUploadList: FileUploadList,
                FileUpload: $('.FileUpload').val(),
                TaxInvoiceNumber: $('#TaxInvoiceNumber').val(),
                GateEntryNo: $('#GateEntryNo').val(),
                GateEntryDate: $('#GateEntryDate').val(),
                Type: $('#Type').val(),
                OtherAdjustment: $("#TotalOtherAdjustment").val(),
                TransportationTaxId: $("#TransportationTaxId").val(),
                InstallationTaxId: $("#InstalltionTaxId").val(),
                AdvancePayTaxId: $("#AdvancePayTaxId").val(),
                MaterialReceivingId: $("#MaterialReceivingId").val().split(',').map(Number),
                DeliveryDate: ($('#GateEntryDate').val() || $('#InvoiceDate').val() || new Date().toISOString().split('T')[0])
            };
            var ensureDate = function (dateValue) {
                if (!dateValue || dateValue === "" || dateValue === "null") {
                    // Fallback to InvoiceDate if available, otherwise Today's date
                    var fallback = $('#InvoiceDate').val() ? new Date($('#InvoiceDate').val()) : new Date();
                    return fallback.toISOString();
                }
                // Convert existing string to ISO so C# understands it perfectly
                return new Date(dateValue).toISOString();
            };
            model.Deliverydate = model.DeliveryDate;
            //model.DeliveryDate = ensureDate(model.GateEntryDate);
            console.log(model);
;            if (model.TDSAmount.toString() == 'NaN') {
                model.TDSAmount = 0;
            }
            if (model.TCSAmount.toString() == 'NaN') {
                model.TCSAmount = 0;
            }
            $("#purchase-Invoice--loader").show();
            $.ajax({
                type: 'POST',
                data: { model: model },
                url: '/PurchaseInvoice/CreateInvoice',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("XSRF-TOKEN",
                        $('input:hidden[name="__RequestVerificationToken"]').val());
                },
                success: function (data) {
                    $('#submit').prop('disabled', true);
                    toastr.success("Invoice generated successfully");
                    window.location.replace('/PurchaseInvoice/Index');
                },
                error: function () {
                    $('#submit').prop('disabled', false);
                    $("#purchase-Invoice--loader").hide();
                    toastr.error("Something went wrong!");
                }
            });
        }
    },

    RefreshLocationInfo: function (shouldRecalculate) {
        var centerId = $('#CenterId').val();
        var vendorId = $('#VendorId').val();

        if (centerId === undefined || vendorId === undefined || vendorId === "0" || vendorId === "" || centerId === "" || centerId === "0") {
            PurchaseInvoiceCreate.LocationInfo = {
                centerCountryId: null,
                centerStateId: null,
                vendorCountryId: null,
                vendorStateId: null
            };
            PurchaseInvoiceCreate.UpdateTaxDropdownOptions();
            if (shouldRecalculate) {
                PurchaseInvoiceCreate.RecalculateAllRowsForLocation();
            }
            return $.Deferred().resolve();
        }

        return $.ajax({
            type: "GET",
            url: "/PurchaseOrder/GetVendorCenterLocation",
            data: { centerId: centerId, vendorId: vendorId },
            success: function (data) {
                PurchaseInvoiceCreate.LocationInfo = {
                    centerCountryId: data.centerCountryId ? parseInt(data.centerCountryId) : null,
                    centerStateId: data.centerStateId ? parseInt(data.centerStateId) : null,
                    vendorCountryId: data.vendorCountryId ? parseInt(data.vendorCountryId) : null,
                    vendorStateId: data.vendorStateId ? parseInt(data.vendorStateId) : null
                };

                if (!PurchaseInvoiceCreate.ValidateLocationState()) {
                    PurchaseInvoiceCreate.UpdateTaxDropdownOptions();
                    return;
                }

                PurchaseInvoiceCreate.UpdateTaxDropdownOptions();
                if (shouldRecalculate) {
                    PurchaseInvoiceCreate.RecalculateAllRowsForLocation();
                }
            },
            error: function (jqXHR, exception) {
                console.log(exception + 'Uncaught Error.\n' + jqXHR.responseText);
            }
        });
    },

    ValidateLocationState: function () {
        var location = PurchaseInvoiceCreate.LocationInfo || {};
        var hasCountry = location.centerCountryId && location.vendorCountryId;

        if (hasCountry && (location.centerStateId === null || location.centerStateId === undefined)) {
            return false;
        }

        if (hasCountry && (location.vendorStateId === null || location.vendorStateId === undefined)) {
            return false;
        }

        return true;
    },

    UpdateTaxDropdownOptions: function () {
        var location = PurchaseInvoiceCreate.LocationInfo || {};
        var hasCountry = location.centerCountryId && location.vendorCountryId;
        var hasState = location.centerStateId && location.vendorStateId;
        var isSameCountry = hasCountry && location.centerCountryId === location.vendorCountryId;
        var isSameState = isSameCountry && hasState && location.centerStateId === location.vendorStateId;

        var allSelects = $('.TaxId, #TransportationTaxId, #InstalltionTaxId, #AdvancePayTaxId');

        allSelects.each(function () {
            var $select = $(this);
            $select.find('option').each(function () {
                var $option = $(this);
                var taxGroup = $.trim(($option.data("group") || "").toString().toUpperCase());
                var optionValue = $option.val();

                // Skip default "select" option
                if (optionValue === "0" || optionValue === "" || optionValue === null) {
                    return;
                }

                if (isSameState) {
                    // For same-state transactions, prevent choosing explicit CGST / SGST rows;
                    // the system will split GST automatically based on location.
                    if (taxGroup === "CGST" || taxGroup === "SGST") {
                        $option.prop('disabled', true);
                    } else {
                        $option.prop('disabled', false);
                    }
                } else {
                    // For inter-state or unknown, allow all GST options
                    $option.prop('disabled', false);
                }
            });

            // If currently selected option is disabled, reset to default
            var selectedOption = $select.find('option:selected');
            if (selectedOption.prop('disabled')) {
                $select.val("0");
            }
        });
    },

    //GetLocationBasedTaxSplit: function (taxGroup, taxAmount) {
    //    taxGroup = $.trim((taxGroup || "").toString().toUpperCase());
    //    var amount = parseFloat(taxAmount) || 0;

    //    // Non-GST taxes are treated as IGST-style single component
    //    if (!taxGroup.includes("GST")) {
    //        return { igst: amount, cgst: 0, sgst: 0 };
    //    }

    //    var location = PurchaseInvoiceCreate.LocationInfo || {};
    //    var hasCountry = location.centerCountryId && location.vendorCountryId;
    //    var hasState = location.centerStateId && location.vendorStateId;
    //    var isSameCountry = hasCountry && location.centerCountryId === location.vendorCountryId;
    //    var isSameState = isSameCountry && hasState && location.centerStateId === location.vendorStateId;

    //    if (isSameCountry && isSameState) {
    //        var halfTax = amount / 2;
    //        return { igst: 0, cgst: halfTax, sgst: halfTax };
    //    }

    //    // Different state (or country) → IGST only
    //    return { igst: amount, cgst: 0, sgst: 0 };
    //},
    GetLocationBasedTaxSplit: function (taxObj, taxAmount) {
        // Ensure tax object exists and is active
        if (!taxObj || taxObj.isActive === false) {
            return { igst: 0, cgst: 0, sgst: 0 };
        }

        var amount = parseFloat(taxAmount) || 0;

        // Determine tax group: use typeName if available, fallback to taxName
        var taxGroup = (taxObj.typeName || taxObj.taxName || "").toString().toUpperCase();

        var location = PurchaseInvoiceCreate.LocationInfo || {};
        var isSameCountry = location.centerCountryId && location.vendorCountryId && location.centerCountryId === location.vendorCountryId;
        var isSameState = isSameCountry && location.centerStateId && location.vendorStateId && location.centerStateId === location.vendorStateId;

        // CGST+SGST split for intra-state
        if ((taxGroup.includes("CGST") || taxGroup.includes("SGST")) || isSameState) {
            var halfTax = amount / 2;
            return { igst: 0, cgst: halfTax, sgst: halfTax };
        }

        // IGST for inter-state or default
        return { igst: amount, cgst: 0, sgst: 0 };
    },


    RecalculateAllRowsForLocation: function () {
        $('#InvoiceDetailsTable tbody tr').each(function () {
            var $row = $(this);
            var target = $row.find('.RequiredQty')[0] || $row.find('.Price')[0] || this;
            calculationOnChangePriceAndQty({ target: target });
        });
    },



    //InclusiveItemCalculation: function (e) {

    //    var $that = $(e.target).closest("tr");

    //    var Price = parseFloat($('.Price', $that).val()) || 0;
    //    var Quantity = parseInt($('.RequiredQty', $that).val()) || 0;
    //    var Discount = parseFloat($('.Discount', $that).text()) || 0;

    //    var PreTotal = Price * Quantity;

    //    var DiscountAmount = (PreTotal * Discount) / 100;

    //    var NetTotal = PreTotal - DiscountAmount;

    //    var $taxSelect = $(".TaxId", $that);
    //    var taxGroup = $taxSelect.find("option:selected").data("group") || "";
    //    taxGroup = taxGroup.toUpperCase();

    //    var TaxRate = parseFloat($('#TaxCharges', $that).val() || $('#TaxCharges', $that).text()) || 0;

    //    // CGST+SGST combined
    //    var combinedRate = (taxGroup === "SGST" || taxGroup === "CGST") ? TaxRate * 2 : TaxRate;

    //    var TotalTaxAmount = (NetTotal * combinedRate) / (100 + combinedRate);

    //    var cgst = 0, sgst = 0, igst = 0;

    //    if (taxGroup === "SGST" || taxGroup === "CGST") {
    //        cgst = TotalTaxAmount / 2;
    //        sgst = TotalTaxAmount / 2;
    //    }
    //    else {
    //        igst = TotalTaxAmount;
    //    }

    //    var TaxableValue = NetTotal - TotalTaxAmount;

    //    $('.CGSTAmount', $that).text(cgst.toFixed(2));
    //    $('.SGSTAmount', $that).text(sgst.toFixed(2));
    //    $('.IGSTAmount', $that).text(igst.toFixed(2));

    //    $('.TotalAfterDisc', $that).text(TaxableValue.toFixed(2));
    //    $('.NetTotal', $that).text(NetTotal.toFixed(2));

    //    $('.DiscountAmount', $that).text(DiscountAmount.toFixed(2));
    //    $('.Total', $that).text(PreTotal.toFixed(2));

    //    if (typeof PurchaseInvoiceCreate.UpdateSummaryCalculation === "function") {
    //        PurchaseInvoiceCreate.UpdateSummaryCalculation();
    //    }
    //},



    //ItemCalculation: function (e) {
    //    var $that = $(e.target).closest("tr");

    //    var Price = parseFloat($that.find('.Price').val()) || 0;
    //    var TaxRate = parseFloat($that.find('.TaxCharges').text()) || 0;
    //    var Discount = parseFloat($that.find('.Discount').text()) || 0;
    //    var Quantity = parseInt($that.find('.RequiredQty').val()) || 0;

    //    var Total = Price * Quantity;
    //    var DiscountAmount = (Total * Discount) / 100;
    //    var TotalafterDisc = Total - DiscountAmount;

    //    // Use .find() with the class .TaxId to be safe
    //    var taxGroup = $that.find(".TaxId option:selected").data("group") || "";
    //    taxGroup = taxGroup.toUpperCase();

    //    // Logic: If group is CGST/SGST, the 9% rate represents 18% total
    //    var combinedRate = (taxGroup === "CGST" || taxGroup === "SGST") ? TaxRate * 2 : TaxRate;
    //    var TotalTax = (TotalafterDisc * combinedRate) / 100;

    //    var cgst = 0, sgst = 0, igst = 0;

    //    if (taxGroup === "CGST" || taxGroup === "SGST") {
    //        cgst = TotalTax / 2;
    //        sgst = TotalTax / 2;
    //    } else {
    //        igst = TotalTax;
    //    }

    //    var NetTotal = TotalafterDisc + TotalTax;

    //    // Update the UI using Class selectors (.) instead of ID selectors (#)
    //    $that.find('.IGSTAmount').text(igst.toFixed(2));
    //    $that.find('.CGSTAmount').text(cgst.toFixed(2));
    //    $that.find('.SGSTAmount').text(sgst.toFixed(2));

    //    $that.find('.DiscountAmount').text(DiscountAmount.toFixed(2));
    //    $that.find('.Total').text(Total.toFixed(2));
    //    $that.find('.TotalAfterDisc').text(TotalafterDisc.toFixed(2));
    //    $that.find('.NetTotal').text(NetTotal.toFixed(2));

    //    if (typeof PurchaseInvoiceCreate.UpdateSummaryCalculation === "function") {
    //        PurchaseInvoiceCreate.UpdateSummaryCalculation();
    //    }
    //},
    ItemCalculation: function (e) {
        var $that = $(e.target).closest("tr");

        var Price = parseFloat($('.Price', $that).val()) || 0;
        var Quantity = parseInt($('.RequiredQty', $that).val()) || 0;
        var Discount = parseFloat($('.Discount', $that).text()) || 0;
        var TaxRate = parseFloat($('.TaxCharges', $that).text()) || 0;

        // Step 1: Pre Total & Discount
        var PreTotal = Price * Quantity;
        var DiscountAmount = (PreTotal * Discount) / 100;
        var TotalAfterDiscount = PreTotal - DiscountAmount;

        // Step 2: Determine tax type based on location
        var $taxSelect = $(".TaxId", $that);
        var taxGroup = ($taxSelect.find("option:selected").data("group") || "").toUpperCase();

        // Step 3: Calculate tax based on intra/inter-state
        var split = PurchaseInvoiceCreate.GetLocationBasedTaxSplit(taxGroup, TotalAfterDiscount * TaxRate / 100);

        // Step 4: Net Total
        var NetTotal = TotalAfterDiscount + split.igst + split.cgst + split.sgst;

        // Step 5: Update row
        $('.Total', $that).text(PreTotal.toFixed(2));
        $('.DiscountAmount', $that).text(DiscountAmount.toFixed(2));
        $('.TotalAfterDisc', $that).text(TotalAfterDiscount.toFixed(2));
        $('.IGSTAmount', $that).text(split.igst.toFixed(2));
        $('.CGSTAmount', $that).text(split.cgst.toFixed(2));
        $('.SGSTAmount', $that).text(split.sgst.toFixed(2));
        $('.NetTotal', $that).text(NetTotal.toFixed(2));

        if (typeof PurchaseInvoiceCreate.UpdateSummaryCalculation === "function") {
            PurchaseInvoiceCreate.UpdateSummaryCalculation();
        }
    },
    //UpdateInvoiceBasicDetails: function () {

    //    var data = {
    //        PurchaseInvoiceId: $("#PurchaseInvoiceId").val(),
    //        GateEntryNo: $("#GateEntryNo").val(),
    //        GateEntryDate: $("#GateEntryDate").val(),
    //        PINumber: $("#PINumber").val(),
    //        InvoiceDate: $("#InvoiceDate").val()
    //    };

    //    $.ajax({
    //        url: '/PurchaseInvoice/UpdateInvoiceBasicDetails',
    //        type: 'POST',
    //        data: data,
    //        success: function (result) {
    //            toastr.success("Invoice details updated successfully.");
    //            //location.reload();
    //            setTimeout(function () {
    //                window.location.href = '/PurchaseInvoice/Dashboard';
    //            }, 1500);
    //        },
    //        error: function () {
    //            alert("Error while updating.");
    //        }
    //    });
    //},
    UpdateInvoiceBasicDetails: function () {
        // 1. Process File Uploads
        var FileUploadList = [];
        TempData.forEach(f => {
            var dropzoneFileName = JSON.parse(f.fileJsonResponse);
            FileUploadList.push({
                FileName: dropzoneFileName[0].fileName,
                GUIDFileName: f.guidFileName,
                FilePath: f.savePath
            });
        });

        // 2. Header Validation
        var gateEntryNo = $("#GateEntryNo").val();
        var gateEntryDate = $("#GateEntryDate").val();
        var piNumber = $("#PINumber").val();
        var invoiceDate = $("#InvoiceDate").val();

        if (!piNumber || !invoiceDate || !gateEntryNo || !gateEntryDate) {
            toastr.error("Please fill Invoice No, Invoice Date, Gate Entry No, and Gate Entry Date before reviewing.");
            return false;
        }

        // 3. Table Data & HSN Validation
        var invoiceDetails = [];
        var isHsnValid = true;

        $("#InvoiceDetailsTable tbody tr[data-invoice]").each(function () {
            var hsn = $(this).find(".HSNCode").val();
            var detailId = $(this).find("#PurchaseInvoiceDetailsId").val();

            var remarks = $(this).find(".Remarks").val();
            var price = $(this).find(".Price").val();
            var taxId = $(this).find(".TaxId").val();
            // Validation: If HSN is empty and field is not readonly
            if (!$(this).find(".HSNCode").prop('readonly') && (!hsn || hsn.trim() === "")) {
                $(this).find(".HSNCode").addClass("is-invalid").css("border", "1px solid red");
                isHsnValid = false;
            } else {
                $(this).find(".HSNCode").removeClass("is-invalid").css("border", "");
            }

            invoiceDetails.push({
                PurchaseInvoiceDetailsId: detailId,
                HSNCode: hsn,
                Remarks: remarks,
                Price: price ? parseFloat(price) : 0,      // ✅ ADD THIS
                TaxId: taxId ? parseInt(taxId) : 0   


            });
        });

        if (!isHsnValid) {
            toastr.error("Please enter HSN/SAC code for all items.");
            return false;
        }

        // 4. Construct Final Data Object
        var data = {
            PurchaseInvoiceId: $("#PurchaseInvoiceId").val(),
            GateEntryNo: gateEntryNo,
            GateEntryDate: gateEntryDate,
            PINumber: piNumber,
            InvoiceDate: invoiceDate,
            FileUploadList: FileUploadList,
            PurchaseInvoiceDetailList: invoiceDetails // Sending the HSN updates here
        };

        $.ajax({
            url: '/PurchaseInvoice/UpdateInvoiceBasicDetails',
            type: 'POST',
            data: data,
            success: function (result) {
                toastr.success("Invoice Reviewed and Updated successfully.");
                setTimeout(function () {
                    window.location.href = '/PurchaseInvoice/Dashboard';
                }, 1500);
            },
            error: function () {
                toastr.error("Error while updating.");
            }
        });
    },
    InclusiveItemCalculation: function (e) {
        var $that = $(e.target).closest("tr");

        var Price = parseFloat($('.Price', $that).val()) || 0;
        var Quantity = parseInt($('.RequiredQty', $that).val()) || 0;
        var Discount = parseFloat($('.Discount', $that).text()) || 0;

        var PreTotal = Price * Quantity;
        var DiscountAmount = (PreTotal * Discount) / 100;
        var NetTotalInclusive = PreTotal - DiscountAmount;

        // Get selected tax object from dropdown
        var $taxSelect = $(".TaxId", $that);
        var selectedTax = $taxSelect.find("option:selected").data("taxObj");

        // Tax rate from object
        var TaxRate = selectedTax ? parseFloat(selectedTax.taxCharges) : 0;

        // Extract tax from inclusive price
        var TaxAmount = (NetTotalInclusive * TaxRate) / (100 + TaxRate);
        var TaxableValue = NetTotalInclusive - TaxAmount;

        // Split CGST/SGST/IGST automatically
        var split = PurchaseInvoiceCreate.GetLocationBasedTaxSplit(selectedTax, TaxAmount);

        // Update UI
        $('.Total', $that).text(PreTotal.toFixed(2));
        $('.DiscountAmount', $that).text(DiscountAmount.toFixed(2));
        $('.TotalAfterDisc', $that).text(TaxableValue.toFixed(2));
        $('.IGSTAmount', $that).text(split.igst.toFixed(2));
        $('.CGSTAmount', $that).text(split.cgst.toFixed(2));
        $('.SGSTAmount', $that).text(split.sgst.toFixed(2));
        $('.NetTotal', $that).text(NetTotalInclusive.toFixed(2));

        if (typeof PurchaseInvoiceCreate.UpdateSummaryCalculation === "function") {
            PurchaseInvoiceCreate.UpdateSummaryCalculation();
        }
    },
    ExternalItemCalculation: function (e) {
        var $that = $(e.target).parents("tr");
        if ($($that).data("field-type") == "transportationExp") {
            var Price = parseFloat($('.TranstotalValue', $that).val());
            if (parseFloat($('#TransportationTaxId').val()) == 0) {
                $("#TransTotalSGSTAmount").text(0);
                $("#TransTotalCGSTAmount").text(0);
                $("#TransTotalIGSTAmount").text(0);
            }
        }
        else if ($($that).data("field-type") == "installationExp") {
            var Price = parseFloat($('.InstalltotalValue', $that).val());
            if (parseFloat($('#InstalltionTaxId').val()) == 0) {
                $("#InstallTotalSGSTAmount").text(0);
                $("#InstallTotalCGSTAmount").text(0);
                $("#InstallTotalIGSTAmount").text(0);
            }
        }
        else if ($($that).data("field-type") == "advancePayment") {
            var Price = parseFloat($('.TotalAdvancePayment', $that).val());
        }
        else {
            var Price = parseFloat($('.Price', $that).val());
        }

        var Tax = parseFloat($('#TaxCharges', $that).text() === "" ? "0" : $('#TaxCharges', $that).text());
        var Total = Price;

        var TaxAmount = Total * Tax / 100;

        var taxGroup;
        if ($($that).data("field-type") == "transportationExp") {
            taxGroup = $("#TransportationTaxId option:selected").data("group");
        } else if ($($that).data("field-type") == "installationExp") {
            taxGroup = $("#InstalltionTaxId option:selected").data("group");
        } else if ($($that).data("field-type") == "advancePayment") {
            taxGroup = $("#AdvancePayTaxId option:selected").data("group");
        } else {
            taxGroup = $("#TaxId option:selected", $that).data("group");
        }

        var split = PurchaseInvoiceCreate.GetLocationBasedTaxSplit(taxGroup, TaxAmount);
        var NetTotal = Total + split.igst + split.cgst + split.sgst;

        if ($($that).data("field-type") == "transportationExp") {
            $('.TransTotalIGSTAmount', $that).text(split.igst.toFixed(2));
            $('.TransTotalCGSTAmount', $that).text(split.cgst.toFixed(2));
            $('.TransTotalSGSTAmount', $that).text(split.sgst.toFixed(2));
        }
        else if ($($that).data("field-type") == "installationExp") {
            $('.InstallTotalIGSTAmount', $that).text(split.igst.toFixed(2));
            $('.InstallTotalCGSTAmount', $that).text(split.cgst.toFixed(2));
            $('.InstallTotalSGSTAmount', $that).text(split.sgst.toFixed(2));
        }
        else if ($($that).data("field-type") == "advancePayment") {
            $('.AdvancePayAmtTotalIGSTAmount', $that).text(split.igst.toFixed(2));
            $('.AdvancePayAmtTotalCGSTAmount', $that).text(split.cgst.toFixed(2));
            $('.AdvancePayAmtTotalSGSTAmount', $that).text(split.sgst.toFixed(2));
        }
        else {
            $('.IGSTAmount', $that).text(split.igst.toFixed(2));
            $('.CGSTAmount', $that).text(split.cgst.toFixed(2));
            $('.SGSTAmount', $that).text(split.sgst.toFixed(2));
        }
        $('#TaxCharges', $that).text((Tax).toFixed(2));
        if ($($that).data("field-type") == "transportationExp") {
            $('.TransTotalAmount', $that).text((NetTotal).toFixed(2));
        }
        if ($($that).data("field-type") == "installationExp") {
            $('.InstallTotalAmount', $that).text((NetTotal).toFixed(2));
        }
        if ($($that).data("field-type") == "advancePayment") {
            $('.AdvancePayAmtTotalAmount', $that).text((NetTotal).toFixed(2));
        }
    },

    ExternalInclusiveItemCalculation: function (e) {
        var $that = $(e.target).parents("tr");
        if ($($that).data("field-type") == "transportationExp") {
            var Price = parseFloat($('.TranstotalValue', $that).val());
        }
        else if ($($that).data("field-type") == "installationExp") {
            var Price = parseFloat($('.InstalltotalValue', $that).val());
        }
        else if ($($that).data("field-type") == "advancePayment") {
            var Price = parseFloat($('.TotalAdvancePayment', $that).val());
        }
        else {
            var Price = parseFloat($('.Price', $that).text());
        }
        var Tax = parseFloat($('#TaxCharges', $that).val() === "" ? "0" : $('#TaxCharges', $that).val());
        //var Discount = parseFloat($('.Discount', $that).val());
        //var Quntity = parseInt($('.RequiredQty', $that).val());

        // Pre Total
        //var PreTotal = Price;

        //1 Discount Amount
        //var DiscountAmount = PreTotal * Discount / 100;

        //2 Net Total
        var NetTotal = Price;

        //3 Tax Amount
        var TaxAmount = (NetTotal * Tax / (100 + Tax));

        //4 price after disc
        //var PriceAfterDisc = (NetTotal - TaxAmount).toFixed(2);

        //5 Final Total
        var Total = (NetTotal - TaxAmount).toFixed(2);

        var taxGroup;
        if ($($that).data("field-type") == "transportationExp") {
            taxGroup = $("#TransportationTaxId option:selected").data("group");
        } else if ($($that).data("field-type") == "installationExp") {
            taxGroup = $("#InstalltionTaxId option:selected").data("group");
        } else if ($($that).data("field-type") == "advancePayment") {
            taxGroup = $("#AdvancePayTaxId option:selected").data("group");
        } else {
            taxGroup = $("#TaxId option:selected", $that).data("group");
        }

        var split = PurchaseInvoiceCreate.GetLocationBasedTaxSplit(taxGroup, TaxAmount);

        if ($($that).data("field-type") == "transportationExp") {
            $('.TransTotalIGSTAmount', $that).text((split.igst).toFixed(2));
            $('.TransTotalCGSTAmount', $that).text((split.cgst).toFixed(2));
            $('.TransTotalSGSTAmount', $that).text((split.sgst).toFixed(2));
        }
        else if ($($that).data("field-type") == "installationExp") {
            $('.InstallTotalIGSTAmount', $that).text((split.igst).toFixed(2));
            $('.InstallTotalCGSTAmount', $that).text((split.cgst).toFixed(2));
            $('.InstallTotalSGSTAmount', $that).text((split.sgst).toFixed(2));
        }
        else if ($($that).data("field-type") == "advancePayment") {
            $('.AdvancePayAmtTotalIGSTAmount', $that).text((split.igst).toFixed(2));
            $('.AdvancePayAmtTotalCGSTAmount', $that).text((split.cgst).toFixed(2));
            $('.AdvancePayAmtTotalSGSTAmount', $that).text((split.sgst).toFixed(2));
        }
        else {
            $('.IGSTAmount', $that).text((split.igst).toFixed(2));
            $('.CGSTAmount', $that).text((split.cgst).toFixed(2));
            $('.SGSTAmount', $that).text((split.sgst).toFixed(2));
        }
        $('#TaxCharges', $that).text((Tax).toFixed(2));
        if ($($that).data("field-type") == "transportationExp") {
            $('.TransTotalAmount', $that).text((NetTotal).toFixed(2));
        }
        if ($($that).data("field-type") == "installationExp") {
            $('.InstallTotalAmount', $that).text((NetTotal).toFixed(2));
        }
        if ($($that).data("field-type") == "advancePayment") {
            $('.AdvancePayAmtTotalAmount', $that).text((NetTotal).toFixed(2));
        }
    },

    UpdateSummaryCalculation: function () {
        var Total = 0.00;
        var TaxChargeTotal = 0.00;
        var DisCountTotal = 0.00;
        var NetTotal = 0.00;

        // Use parseFloat properly to avoid "NaN" or string concatenation
        var AddCostAmount = parseFloat($('#AddCostAmount').text()) || 0;
        var AddCostAmount2 = parseFloat($('#AddCostAmount2').text()) || 0;
        var advancePayment = parseFloat($('#AdvancePayAmt').text()) || 0;

        $('#InvoiceDetailsTable tbody tr').each(function () {
            // Summing the base values
            Total += parseFloat($('.TotalInvoiceValue', this).text()) || 0;
            DisCountTotal += parseFloat($('.DiscountAmount', this).text()) || 0;
            NetTotal += parseFloat($('.NetTotal', this).text()) || 0;

            // Summing the Tax
            var igst = parseFloat($('.IGSTAmount', this).text()) || 0;
            var cgst = parseFloat($('.CGSTAmount', this).text()) || 0;
            var sgst = parseFloat($('.SGSTAmount', this).text()) || 0;

            if (igst === 0) {
                TaxChargeTotal += (cgst + sgst);
            } else {
                TaxChargeTotal += igst;
            }
        });

        // CORRECT LOGIC: Grand Total is the full value of the invoice
        var CalculatedGrandTotal = (NetTotal + AddCostAmount + AddCostAmount2);

        // If you need the balance after advance for a "Payable" field:
        var BalancePayable = (CalculatedGrandTotal - advancePayment).toFixed(2);

        // Update UI Elements
        $('#SubTotalDisplay').html(Total.toFixed(2));
        $('#ItemDisocuntAmount').html(DisCountTotal.toFixed(2));
        $('#ItemTaxTotal').html(TaxChargeTotal.toFixed(2));

        // Set these to the FULL value (5486.25 in your example)
        $('#ItemNetTotal').val(CalculatedGrandTotal.toFixed(2));
        $('#TotalNetTotal').val(CalculatedGrandTotal.toFixed(2));

        // If you have a specific field for 'Balance to Pay', use BalancePayable there
        // $('#BalanceAmount').val(BalancePayable); 

        $('#SubTotal').text(Total.toFixed(2));
        $('#TotalDiscountAmount').val(DisCountTotal.toFixed(2));
        $('#TotalTaxAmount').val(TaxChargeTotal.toFixed(2));

        $.when(getTotalRowAmount()).then(function () {
            grandTotalCalc();
        });
    },
    AddTDSAmount: function () {
        var grandTotal = 0;
        var tdsAmount = parseFloat($("#TDSAmount").val() == "" ? 0 : $('#TDSAmount').val());
        var tcsAmount = parseFloat($("#TCSAmount").val() == "" ? 0 : $('#TCSAmount').val());
        var subtotal = parseFloat($("#TotalInvoiceValue").html());
        grandTotal = (subtotal - tdsAmount + tcsAmount) + parseFloat($("#AddCostAmount").val()) + $("#TotalOtherAdjustment").val() * 1;
        var roundGrandTotal = $("#FinalNetTotal").text(grandTotal.toFixed(2));
        $("#FinalNetTotal").val(parseFloat(roundGrandTotal.val()).toFixed(2));
    },

    QuantityValidation: function (RowId, Quantity, POQuantity) {
        var PIQuantity = parseFloat(Quantity);
        if (Math.ceil(POQuantity * 1.1) < PIQuantity) {
            $('#submit').attr('disabled', true);
            $('#InvoiceDetailsTable tbody tr#' + RowId + ' td .Quntityhide').html('Invalid Qty');
            return false;
        }
        else {
            $('#submit').attr('disabled', false);
            $('#InvoiceDetailsTable tbody tr#' + RowId + ' td .Quntityhide').html('');
        }
    },

    ApprovePI: function (e) {
    
        var isValid = true;

        if (!$('#GateEntryNo').val() || $('#GateEntryNo').val().trim() === '' ||
            $('#GateEntryNo').val() == '0' || parseInt($('#GateEntryNo').val()) <= 0) {
            toastr.error("Please enter Gate Entry No");
            isValid = false;
        }

        if (!$('#GateEntryDate').val() || $('#GateEntryDate').val().trim() === '') {
            toastr.error("Please enter Gate Entry Date");
            isValid = false;
        }

        if (!isValid) {
            return false;
        }
        if (!$('#PINumber').val()) {
            toastr.error("Please enter Invoice No");
            return false;
        }
        

        var InvoiceDetailList = [];
        $('#InvoiceDetailsTable tbody tr').each(function () {
            if (parseFloat($('#Price', this).val()) > 0) {
                var PurchaseInvoiceDetail = {
                    InventoryId: parseInt($('#InventoryId', this).val()),
                    ExpiryDate: $('#ExpiryDate', this).val(),
                    BatchNumber: $('#BatchNumber', this).val(),
                    HSNCode: $('#HSNCode', this).val() == "" ? "" : parseInt($('#HSNCode', this).val()),
                    POQuantity: parseInt($('#POQty', this).text()),
                    PIQuantity: parseInt($('#RequiredQty', this).val()),
                    UOMId: parseInt($('#UOMId', this).val()),
                    Price: parseFloat($('#Price', this).val()),
                    Total: parseFloat($('#Total', this).text()),
                    Discount: $('#Discount', this).text() != null ? parseFloat($('#Discount', this).text()) : 0,
                    DiscountAmount: $('#DiscountAmount', this).text() != null ? parseFloat($('#DiscountAmount', this).text()) : 0,
                    TotalAfterDisc: $('#TotalAfterDisc', this).text() != null ? parseFloat($('#TotalAfterDisc', this).text()) : 0,
                    TaxId: parseInt($('#TaxId', this).val() > 0 ? $('#TaxId', this).val() : 0),
                    TaxCharges: $('#TaxCharges', this).text() != null ? parseFloat($('#TaxCharges', this).text()) : 0,
                    TaxAmount: $('#IGSTAmount', this).text() != null ? parseFloat($('#IGSTAmount', this).text()) : 0,
                    IGSTAmount: $('#IGSTAmount', this).text() != null ? parseFloat($('#IGSTAmount', this).text()) : 0,
                    CGSTAmount: $('#CGSTAmount', this).text() != null ? parseFloat($('#CGSTAmount', this).text()) : 0,
                    SGSTAmount: $('#SGSTAmount', this).text() != null ? parseFloat($('#SGSTAmount', this).text()) : 0,
                    NetTotal: parseFloat($('#NetTotal', this).text()),
                    Remarks: $('#Remarks', this).val(),
                    SRDescription: $('#SRDescription', this).text(),
                }
                InvoiceDetailList.push(PurchaseInvoiceDetail);
                IsValid = true;
            }
        });
        var model = {
            CountryId: $('#CountryId').val(),
            CenterId: $('#CenterId').val(),
            VendorId: $('#VendorId').val(),
            VendorBankDetailsId: $('#VendorBankDetailsId').val(),
            PurchaseRequisitionId: $('#PurchaseRequisitionId').val(),
            PurchaseRequisitionNumber: $('#PurchaseRequisitionNumber').val(),
            PurchaseOrderId: $('#PurchaseOrderId').val(),
            PurchaseOrderNumber: $('#PurchaseOrderNumber').val(),
            GRNId: $('#GRNId').val(),
            GRNNumber: $('#GRNNumber').val(),
            PurchaseInvoiceNumber: $('#PurchaseInvoiceNumber').val(),
            CategoryId: $('#CategoryId').val(),
            Currency: $('#Currency').val(),
            SubTotal: $('#SubTotal').html(),
            TDS: $('#TDS').val(),
            TDSAmountId: $('#TDS').val(),
            TDSAmount: parseFloat($('#TDSAmount').val()),
            TCSAmountId: $('#TCS').val(),
            TCS: $('#TCS').val(),
            TCSAmount: parseFloat($('#TCSAmount').val()),
            AdvancePaymentTDS: $('#advancePaymentTDS').val(),
            AdvancePaymentTDSAmount: $('#advancePaymentTDSAmount').val(),
            AdditionalExpesName: $('#AddCostDescription').val(),
            AddCostAmount: $('#AddCostAmount').val(),
            AddCostDescription2: $('#AddCostDescription2').attr("data-val"),
            InstallationCharges: $('#InstalltotalValue').val(),
            TransportationCharges: $('#TranstotalValue').val(),
            TotalDiscountAmount: $('#ItemDisocuntAmount').html(),
            TotalTaxAmount: $('#ItemTaxTotal').html(),
            ModeOfPayment: $('#ModeOfPayment').val(),
            PaymentDueDate: $('#PaymentDueDate').val(),
            InvoiceDate: $('#InvoiceDate').val(),
            AdvancePayPer: $("#AdvancePayPer").val(),
            AdvancePayAmt: $('#TotalAdvancePayment').val(),
            TermsAndCondition: $('#TermsAndCondition').val(),
            TotalNetTotal: $('#FinalNetTotal').text(),
            Notes: $('#Notes').val(),
            PurchaseInvoiceDetailList: InvoiceDetailList,
            //FileUploadList: FileUploadList,
            FileUpload: $('.FileUpload').val(),
            TaxInvoiceNumber: $('#TaxInvoiceNumber').val(),
            GateEntryNo: $('#GateEntryNo').val(),
            GateEntryDate: $('#GateEntryDate').val(),
            Type: $('#Type').val(),
            OtherAdjustment: $("#TotalOtherAdjustment").val(),
            TransportationTaxId: $("#TransportationTaxId").val(),
            InstallationTaxId: $("#InstalltionTaxId").val(),
            AdvancePayTaxId: $("#AdvancePayTaxId").val(),
        };
        $('#modalApprovePurchaseInvoice').modal('show');
    },

    PaymentPI: function (e) {
        $('#modalPaymentPurchaseInvoice').modal('show');
    },

    RejectPI: function (e) {
        $('#modalRejectPurchaseInvoice').modal('show');
        if (e == undefined) {
            $('#PrInumShow').hide();
        } else {
            $('#PrInumShow').show();
        }
    },
    printFunction: function () {
        var divToPrint = document.getElementById("tableDetailsId");
        var newWin = window.open("", "Print Window", "width=1200,height=800");
        newWin.document.write('<html><head><title></title>');
        newWin.document.write('<link href="' + window.origin + '/Content/css/bootstrap.min.css" rel="stylesheet" type="text/css">');
        newWin.document.write('<link href="' + window.origin + '/Content/css/main.css" rel="stylesheet" type="text/css">');
        newWin.document.write('<link href="' + window.origin + '/Content/css/custom.css" rel="stylesheet" type="text/css">');
        newWin.document.write('<style>.prGridAction{display:none;}  table{display:table !important;color:#000000;}  table thead th {background-color: #666666 !important;color: #ffffff !important;font-weight: 600 !important;white-space: nowrap !important;} table thead th a{color:ffffff} </style></head><body>');
        newWin.document.write(divToPrint.outerHTML);
        newWin.document.write('</body></html>');
        newWin.document.close();
        newWin.focus();
        newWin.print();
        setTimeout(function () {
            newWin.close();
        }, 3500)
    },
    printInvoiceDetailsFunction: function (id) {
        var divToPrint = document.getElementById("POInvoiceTbl");
        var newWin = window.open("", "Print Window", "width=1200,height=800");
        newWin.document.write('<html><head><title>' + id + '</title>');
        newWin.document.write('<link href="' + window.origin + '/Content/css/bootstrap.min.css" rel="stylesheet" type="text/css">');
        newWin.document.write('<link href="' + window.origin + '/Content/css/main.css" rel="stylesheet" type="text/css">');
        newWin.document.write('<link href="' + window.origin + '/Content/css/custom.css" rel="stylesheet" type="text/css">');
        newWin.document.write('<style>.table-responsive{overflow-x:hidden;width:100%;display:table-caption} table{display:table !important;color:#000000;}  table thead th {background-color: #666666 !important;color: #ffffff !important;font-weight: 600 !important;white-space: nowrap !important;} table thead th a{color:#ffffff} .table-bordered td{border:1px solid #000000!important} </style></head><body>');
        newWin.document.write(divToPrint.outerHTML);
        newWin.document.write('</body></html>');
        newWin.document.close();
        newWin.focus();
        newWin.print();
        setTimeout(function () {
            newWin.close();
        }, 3500)
    },
    exportFile: function () {
        $("#PurchaseInvoiceDetailsDiv").table2excel({
            exclude: ".prGridAction",
            filename: "PIDetails.xls",
            preserveColors: true
        });
    },
    RejectPIReason: function () {
        debugger;
        var rejectPr = $('#rejectReason').val();
        //var rejectId = parseInt($("#PIId").val());
        //var rejectId = parseInt($("#Rejectnumber").val());
        var $btn = $(e);

        // Get the ID from the button's data attributes
        var rejectId = $btn.data('delete-id');
        var piNumber = $btn.data('delete-number');

        console.log("Reject button clicked - ID:", rejectId, "PI Number:", piNumber);

        if (rejectPr == "" || rejectPr == null) {
            $("#ReasonOfReject").html("Enter Reason");
        }
        else {
            $("#ReasonOfReject").html("");
            $("#RejectPIReason").prop('disabled', true);
            $("#purchase-Invoice--loader").show();
            $("#modalRejectPurchaseInvoice").hide();
            $.ajax({
                type: "POST",
                url: "/PurchaseInvoice/RejectPurchaseInvoice?Id=" + rejectId + "&&rejectReason=" + rejectPr,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("XSRF-TOKEN",
                        $('input:hidden[name="__RequestVerificationToken"]').val());
                },
                contentType: "application/json; charset=utf-8",
                //dataType: "html",
                success: function (data) {
                    location.reload();
                },
                error: function (data) {
                    alert(data.msg);
                }
            });
        }
    },

    SubmitPIForApprove: function (id) {
        debugger;
        var piId = $('#PurchaseInvoiceId').val();
        var reason = $("#ApproverejectReason").val();
        var IsValid = true;
        var InvoiceDetailList = [];

        if ($("#GateEntryDateUpdate").val() != null && $("#GateEntryDateUpdate").val() != undefined && $("#GateEntryDateUpdate").val() != '') {
            var setDate = $("#GateEntryDateUpdate").val();
            $('#GateEntryDate').val(setDate);
        }
        if ($('#PurchaseOrderId').val() != 0 && ($('#GateEntryNo').val() == null || $('#GateEntryNo').val() == 0 || $('#GateEntryNo').val() == undefined || $('#GateEntryNo').val() == '')) {
            $('#modalApprovePurchaseInvoice').modal('hide');
            $("#approvePI").prop('disabled', false);
            toastr.error("Please enter Gate Entry No");
            IsValid = false;
            return IsValid;
        }
        if ($('#PurchaseOrderId').val() != 0 && ($('#GateEntryDate').val() == null || $('#GateEntryDate').val() == undefined || $('#GateEntryDate').val() == '')) {
            $('#modalApprovePurchaseInvoice').modal('hide');
            $("#approvePI").prop('disabled', false);
            toastr.error("Please enter Gate Entry Date");
            IsValid = false;
            return IsValid;
        }
        if ($('#PINumber').val() == null || $('#PINumber').val() == undefined || $('#PINumber').val() == '') {
            $('#modalApprovePurchaseInvoice').modal('hide');
            $("#approvePI").prop('disabled', false);
            toastr.error("Please enter Invoice No");
            IsValid = false;
            return IsValid;
        }
        if (isObservationParam === true) {
            reason = $("#holdReasonInput").val();
            if (!reason) {
                toastr.error("Please enter observation reason");
                return;
            }
        }

        $('#InvoiceDetailsTable tbody tr').each(function () {
            //if (parseFloat($('#Price', this).val()) == 0) {
            //    $('#modalApprovePurchaseInvoice').modal('hide');
            //    $("#approvePI").prop('disabled', false);
            //    toastr.error("Please enter Price");
            //    IsValid = false;
            //    return IsValid;
            //}
            if (($('.FOCType', this).val() == 'Non FOC' || $('.FOCType', this).val() == '') && ($('#PurchaseOrderNumber').val() != "" && ($('#Price', this).val() == '' || $('#Price', this).val() == 0 || $('#Price', this).val() == null || $('#Price', this).val() == undefined))) {
                toastr.error("Please Enter Price");
                $('#modalApprovePurchaseInvoice').modal('hide');
                $('#approvePI').attr('disabled', false);
                isValid = false;
                return false;
            }

            if (parseFloat($('#Price', this).val()) > 0 || parseFloat($('#RequestedAmount', this).val()) > 0) {
                var PurchaseInvoiceDetail = {
                    PurchaseInvoiceDetailsId: parseInt($('#PurchaseInvoiceDetailsId', this).val()),
                    InventoryId: parseInt($('#InventoryId', this).val()),
                    ExpiryDate: $('#ExpiryDate', this).val(),
                    BatchNumber: $('#BatchNumber', this).val(),
                    HSNCode: $('#HSNCode', this).val() == "" ? "" : parseInt($('#HSNCode', this).val()),
                    POQuantity: parseInt($('#POQty', this).text()),
                    PIQuantity: parseInt($('#RequiredQty', this).val()),
                    UOMId: parseInt($('#UOMId', this).val()),
                    Price: parseFloat($('#Price', this).val()),
                    Total: parseFloat($('#Total', this).text()),
                    Discount: $('#Discount', this).text() != null ? parseFloat($('#Discount', this).text()) : 0,
                    DiscountAmount: $('#DiscountAmount', this).text() != null ? parseFloat($('#DiscountAmount', this).text()) : 0,
                    TotalAfterDisc: $('#TotalAfterDisc', this).text() != null ? parseFloat($('#TotalAfterDisc', this).text()) : 0,
                    //TaxId: parseInt($('#TaxId', this).val() > 0 ? $('#TaxId', this).val() : null),
                    TaxId: parseInt($('#TaxId', this).val() ? $('#TaxId', this).val() : 0),
                    TaxCharges: $('#TaxCharges', this).text() != null ? parseFloat($('#TaxCharges', this).text()) : 0,
                    TaxAmount: $('#IGSTAmount', this).text() != null ? parseFloat($('#IGSTAmount', this).text()) : 0,
                    IGSTAmount: $('#IGSTAmount', this).text() != null ? parseFloat($('#IGSTAmount', this).text()) : 0,
                    CGSTAmount: $('#CGSTAmount', this).text() != null ? parseFloat($('#CGSTAmount', this).text()) : 0,
                    SGSTAmount: $('#SGSTAmount', this).text() != null ? parseFloat($('#SGSTAmount', this).text()) : 0,
                    NetTotal: parseFloat($('#NetTotal', this).text()),
                    Remarks: $('#Remarks', this).val(),
                    SRDescription: $('#SRDescription', this).text(),
                }
                InvoiceDetailList.push(PurchaseInvoiceDetail);
                IsValid = true;
            }
        });
        if (IsValid) {
            var model = {
                CountryId: $('#CountryId').val(),
                CenterId: $('#CenterId').val(),
                VendorId: $('#VendorId').val(),
                PurchaseRequisitionId: $('#PurchaseRequisitionId').val(),
                PurchaseRequisitionNumber: $('#PurchaseRequisitionNumber').val(),
                PurchaseOrderId: $('#PurchaseOrderId').val(),
                PurchaseOrderNumber: $('#PurchaseOrderNumber').val(),
                GRNId: $('#GRNId').val(),
                GRNNumber: $('#GRNNumber').val(),
                PurchaseInvoiceId: $('#PurchaseInvoiceId').val(),
                PurchaseInvoiceNumber: $('#PurchaseInvoiceNumber').val(),
                CategoryId: $('#CategoryId').val(),
                Currency: $('#Currency').val(),
                SubTotal: $('#SubTotal').html(),
                TDS: $('#TDS').val(),
                TDSAmountId: $('#TDS').val(),
                TDSAmount: Math.abs(parseFloat($('#TDSAmount').val())),
                TCS: $('#TCS').val(),
                TCSAmount: Math.abs(parseFloat($('#TCSAmount').val())),
                TCSAmountId: $('#TCS').val(),
                AdvancePaymentTDS: $('#advancePaymentTDS').val(),
                AdvancePaymentTDSAmount: $('#advancePaymentTDSAmount').val(),
                AdditionalExpesName: $('#AddCostDescription').val(),
                AddCostAmount: $('#AddCostAmount').val(),
                AddCostDescription2: $('#AddCostDescription2').attr("data-val"),
                InstallationCharges: $('#InstalltotalValue').val(),
                TransportationCharges: $('#TranstotalValue').val(),
                TotalDiscountAmount: $('#ItemDisocuntAmount').html(),
                TotalTaxAmount: $('#ItemTaxTotal').html(),
                ModeOfPayment: $('#ModeOfPayment').val(),
                PaymentDueDate: $('#PaymentDueDate').val(),
                InvoiceDate: $('#InvoiceDate').val(),
                AdvancePayPer: $("#AdvancePayPer").val(),
                AdvancePayAmt: $('#TotalAdvancePayment').val(),
                TermsAndCondition: $('#TermsAndCondition').val(),
                TotalNetTotal: $('#FinalNetTotal').text(),
                Notes: $('#Notes').val(),
                PurchaseInvoiceDetailList: InvoiceDetailList,
                FileUploadList: FileUploadList,
                FileUpload: $('.FileUpload').val(),
                TaxInvoiceNumber: $('#TaxInvoiceNumber').val(),
                GateEntryNo: $('#GateEntryNo').val(),
                GateEntryDate: $('#GateEntryDate').val() != null && $('#GateEntryDate').val() != '' && $('#GateEntryDate').val() != undefined ? $('#GateEntryDate').val() : $('#GateEntryDateUpdate').val(),
                Type: $('#Type').val(),
                OtherAdjustment: $("#TotalOtherAdjustment").val(),
                TransportationTaxId: $("#TransportationTaxId").val(),
                InstallationTaxId: $("#InstalltionTaxId").val(),
                AdvancePayTaxId: $("#AdvancePayTaxId").val(),
                PINumber: $("#PINumber").val(),
                HoldReason: $("#holdReasonInput").val()
            };
            var FileUploadList = [];
            TempData.forEach(f => {
                var dropzoneFileName = JSON.parse(f.fileJsonResponse)
                FileUploadList.push({
                    FileName: dropzoneFileName[0].FileName,
                    GUIDFileName: f.guidFileName,
                    FilePath: f.savePath
                });
            });
            model.FileUploadList = FileUploadList;
            $("#purchase-Invoice--loader").show();
            $.ajax({
                type: 'POST',
                data: { invoiceEntity: model },
                url: '/PurchaseInvoice/ApprovePurchaseInvoice?id=' + piId + "&ApproveRejectReason=" + reason,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("XSRF-TOKEN",
                        $('input:hidden[name="__RequestVerificationToken"]').val());
                },
                success: function (data) {
                    $('#ExistError').html('');
                    $('#modalApprovePurchaseInvoice').modal('hide');
                    window.location.reload();
                },
                error: function (data) {
                    toastr.error("Something went wrong");
                    $("#purchase-Invoice--loader").hide();
                }
            });
        }
    },
    RemoveInventory: function (RowId) {
        if ($('#PIInentoryItem tr').length > 6) {
            $("#" + RowId).remove();
            $('#RemoveInventoryError').addClass('d-none');
            $('#RemoveInventoryError').html('');
        }
        else {
            $('#RemoveInventoryError').removeClass('d-none');
            $('#RemoveInventoryError').html('You are not allowed to remove the data.');
        }
        PurchaseInvoiceCreate.reOrderId();
        $.when(getTotalRowAmount()).then(function () {
            grandTotalCalc()
        });
    },

    reOrderId: function () {
        $("#InvoiceDetailsTable").find("tbody tr").each(function (index, item) {
            index = $("#InvoiceDetailsTable").data("startid") + index;
            $(item).find(".rowId").val(index);
        })
    },

    AllowNumberOnly: function (e) {
        if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57)) {
            //display error message
            toastr.error("enter numeric values only");
            return false;
        }
    },
}

PurchaseInvoiceCreate.Init();

// add payment date based on calculation on selected invoice date and credit days
var expDueDateDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
//$(".PaymentDueDate").val(moment(expDueDateDate).format("DD-MMM-YYYY"));
//$("#InvoiceDate").val(moment(expDueDateDate).format("DD-MMM-YYYY"));
$('#InvoiceDate').on('dp.change', function (e) {
    var formatedValue = new Date(e.date.format(e.date._f));
    expDueDateDate = new Date(formatedValue.setDate(formatedValue.getDate() + parseInt($("#CreditDays").val())));
    $(".PaymentDueDate").val(moment(expDueDateDate).format("DD-MMM-YYYY"));
})

// can not select gate entry date more than before 2 days
var today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
$("#GateEntryDate").datetimepicker({
    viewMode: 'days',
    defaultDate: today,
    format: 'DD-MMM-YYYY',
    minDate: new Date(date.getFullYear(), date.getMonth(), date.getDate() - 2),
    icons: {
        time: 'fa fa-clock-o',
        date: 'fa fa-calendar',
        up: 'fa fa-chevron-up',
        down: 'fa fa-chevron-down',
        previous: 'fa fa-chevron-left',
        next: 'fa fa-chevron-right',
        today: 'fa fa-dot-circle-o',
        clear: 'fa fa-trash',
        close: 'fa fa-times'
    }
})
$('#GateEntryDate').on('dp.change', function (e) {
    var formatedValue = new Date(e.date.format(e.date._f));
    var todayDate = new Date().getDate() - 2;
    if (todayDate > formatedValue.getDate()) {
        $("#submit").prop("disabled", true);
        toastr.error("Please select proper Gate entry date");
    }
    else {
        $("#submit").prop("disabled", false);
    }
})

$('.RequiredQty,.TaxId,.InstalltotalValue,.TranstotalValue,.TotalAdvancePayment').change(function (e) {
    var $that = $(e.target).parents("tr");
    var TaxId = $(this).parents("tr").find(".TaxId").val();
    var TaxCategory = $('#TaxCategory').val();
    if ($(this).hasClass('RequiredQty')) {
        calculationOnChangePriceAndQty(e);
        return;
    }
    else {
        if (TaxId === null || TaxId === "" || TaxId === undefined) {
            $('#TaxCharges', $that).val(0);
            $('.Taxid', $that).val(TaxId);
        }
        else {
            if (TaxId != 0) {
                $("#rowTotalSGSTAmount").text(0);
                $("#rowTotalCGSTAmount").text(0);
                $("#rowTotalIGSTAmount").text(0);
                $("#rowTotalAmount").text(0);
                $.ajax({
                    type: "POST",
                    url: '/Common/GetTaxDetailsbyTaxId?TaxId=' + TaxId,
                    dataType: 'json',
                    success: function (data) {
                        console.log('TaxCharges', data);
                        $('#TaxCharges', $that).text(data["taxCharges"]);
                        $('.TaxName', $that).val(data["taxCharges"]);
                        $('.TaxAmount', $that).val(data["TaxAmount"]);
                        if (TaxCategory === "Inclusive") {
                            if ($($that).data("field-type") == "transportationExp" || $($that).data("field-type") == "installationExp" || $($that).data("field-type") == "advancePayment") {
                                PurchaseInvoiceCreate.ExternalItemCalculation(e);
                            }
                            else {
                                PurchaseInvoiceCreate.InclusiveItemCalculation(e);
                            }
                        }
                        else {
                            if ($($that).data("field-type") == "transportationExp" || $($that).data("field-type") == "installationExp" || $($that).data("field-type") == "advancePayment") {
                                PurchaseInvoiceCreate.ExternalItemCalculation(e);
                            }
                            else {
                                PurchaseInvoiceCreate.ItemCalculation(e);
                            }
                        }
                    },
                    error: function (jqXHR, exception) {
                        console.log(exception + 'Uncaught Error.\n' + jqXHR.responseText);
                    }
                });
            }
            else {
                $("#TransTotalAmount").text(($("#TranstotalValue").val() * 1).toFixed(2));
                $("#InstallTotalAmount").text(($("#InstalltotalValue").val() * 1).toFixed(2));
                $("#AdvancePayAmtTotalAmount").text(($("#TotalAdvancePayment").val() * 1).toFixed(2));
                if (TaxCategory === "Inclusive") {
                    PurchaseInvoiceCreate.InclusiveItemCalculation(e);
                }
                else {
                    PurchaseInvoiceCreate.ExternalItemCalculation(e);
                }
            }
            setTimeout(function () {
                PurchaseInvoiceCreate.UpdateSummaryCalculation();
            }, 500);
        }
    }
    setTimeout(function () {
        $("#TDS").trigger("change");
    }, 500);
    setTimeout(function () {
        $("#TCS").trigger("change");
    }, 500);
});

$("#TDSAmount").change(function () {
    var TDSAmount = parseFloat($("#TDSAmount").val() == "" ? 0 : $('#TDSAmount').val());
    var subtotal = parseFloat($("#grandTotalTaxableValue").html());
    if (TDSAmount != 0) {
        var TDSValue = parseFloat((TDSAmount * 100) / subtotal);
        $("#TDS").val(TDSValue.toFixed(2));
    }
    else {
        $("#TDS").val(parseFloat("0"));
    }
    PurchaseInvoiceCreate.AddTDSAmount();
});
$("#TCSAmount").change(function () {
    var TCSAmount = parseFloat($("#TCSAmount").val() == "" ? 0 : $('#TCSAmount').val());
    var subtotal = parseFloat($("#grandTotalTaxableValue").html());
    if (TCSAmount != 0) {
        var TCSValue = parseFloat((TCSAmount * 100) / subtotal);
        $("#TCS").val(TCSValue.toFixed(2));
    }
    else {
        $("#TCS").val(parseFloat("0"));
    }
    PurchaseInvoiceCreate.AddTDSAmount();
});

$("#TDS").change(function () {
    TDSChange();
});
$("#TCS").change(function () {
    TCSChange();
});
function TDSChange() {
    var TDSValue = parseFloat($('#TDS option:selected').attr('data-group'));
    var subtotal = parseFloat($("#grandTotalTaxableValue").html());
    var AdvancedPayment = $("#TotalAdvancePayment").val();
    var TDSAmount = Math.round(parseFloat(((subtotal - AdvancedPayment) * TDSValue) / 100));
    $("#TDSAmount").val(TDSAmount);

    PurchaseInvoiceCreate.AddTDSAmount();
}
function TCSChange() {
    var TCSValue = parseFloat($('#TCS option:selected').attr('data-group'));
    var subtotal = parseFloat($("#grandTotalTaxableValue").html());
    var AdvancedPayment = $("#TotalAdvancePayment").val();
    var TCSAmount = Math.round(parseFloat(((subtotal - AdvancedPayment) * TCSValue) / 100));
    $("#TCSAmount").val(TCSAmount);

    PurchaseInvoiceCreate.AddTDSAmount();
}

$("#advancePaymentTDSAmount").change(function () {
    var TDSAmount = parseFloat($("#advancePaymentTDSAmount").val() == "" ? 0 : $('#advancePaymentTDSAmount').val());
    var subtotal = parseFloat($("#grandTotalTaxableValue").html());
    if (TDSAmount != 0) {
        var TDSValue = parseFloat((TDSAmount * 100) / subtotal);
        $("#advancePaymentTDS").val(TDSValue.toFixed(2));
    }
    else {
        $("#advancePaymentTDS").val(parseFloat("0"));
    }
    PurchaseInvoiceCreate.AddTDSAmount();
});

$("#advancePaymentTDS").change(function () {
    var TDSValue = parseFloat($("#advancePaymentTDS").val());
    var AdvancedPayment = $("#TotalAdvancePayment").val();
    var TDSAmount = Math.round(parseFloat((AdvancedPayment * TDSValue) / 100)).toFixed(2);
    $("#advancePaymentTDSAmount").val(TDSAmount);
    PurchaseInvoiceCreate.AddTDSAmount();
});

$("#VendorBankAccountNumber").change(function () {
    $.ajax({
        type: 'GET',
        url: '/PurchaseInvoice/GetVendorBankDetailsByVendorId?AccountNumber=' + $("#VendorBankAccountNumber").val(),
        success: function (data) {
            if (data != null) {
                console.log("data:", data);
                $("#VendorName").text(data.vendorName);
                $("#VendorBankName").text(data.beneficiaryBank1);
                $("#BranchCode").text(data.branchCode1);
                $("#BankAddress").text(data.bankAddress1);
                $("#IFSCCode").text(data.ifscCode1);
                $("#VendorBankDetailsId").val(data.vendorBankDetailId1);
            }
            else {
                toastr.error("Account Details Not Found");
            }
        },
        error: {
        }
    });
});

Dropzone.autoDiscover = false;
var grnCreateDropzone;

$(document).ready(function () {
    // 1. Target the correct ID from your HTML
    if ($('#dropzoneJsForm').length > 0) {

        grnCreateDropzone = new Dropzone("#dropzoneJsForm", {
            url: "/Common/Upload", // Ensure this matches your controller
            parallelUploads: 3,
            maxFiles: 5,
            acceptedFiles: '.csv,.xls,.xlsx,.pdf,.msg',
            addRemoveLinks: true,
            dictDefaultMessage: "Drag or click here to upload",

            success: function (file, response) {
                // Ensure response contains: { fileJsonResponse, guidFileName, savePath }
                TempData.push(response);

                // Update the hidden field so the Form knows about the files
                var FileUploadList = TempData.map(f => {
                    var nameObj = JSON.parse(f.fileJsonResponse);
                    return {
                        FileName: nameObj[0].FileName || nameObj[0].fileName,
                        GUIDFileName: f.guidFileName,
                        FilePath: f.savePath
                    };
                });
                $('.FileUpload').val(JSON.stringify(FileUploadList));

                file.previewElement.classList.add("dz-success");
            },
            removedfile: function (file) {
                // Logic to remove file from TempData
                TempData = TempData.filter(f => {
                    var nameObj = JSON.parse(f.fileJsonResponse);
                    var fName = nameObj[0].FileName || nameObj[0].fileName;
                    return fName !== file.name;
                });
                $('.FileUpload').val(JSON.stringify(TempData));
                file.previewElement.remove();
            }
        });
    }
}); 

function GetTaxValue(e) {
    var $that = $(e.target).parents("tr");
    var TaxId = $($that).parents("tr").find(".TaxId").val();
    var TaxCategory = $('#TaxCategory', $that).val();
    if (TaxId === null || TaxId === "" || TaxId === undefined) {
        $('#TaxCharges', $that).val(0);
        $('.Taxid', $that).val(TaxId);
    }
    else {
        if (TaxId != 0) {
            $("#rowTotalSGSTAmount").text(0);
            $("#rowTotalCGSTAmount").text(0);
            $("#rowTotalIGSTAmount").text(0);
            $("#rowTotalAmount").text(0);
            $.ajax({
                type: "POST",
                url: '/Common/GetTaxDetailsbyTaxId?TaxId=' + TaxId,
                dataType: 'json',
                success: function (data) {
                    console.log('TaxCharges', data);
                    $('#TaxCharges', $that).val(data["taxCharges"]);
                    $('.TaxName', $that).val(data["taxCharges"]);
                    $('.TaxAmount', $that).val(data["TaxAmount"]);
                    if (TaxCategory === "Inclusive") {
                        PurchaseInvoiceCreate.InclusiveItemCalculation(e);
                    }
                    else {
                        PurchaseInvoiceCreate.ItemCalculation(e);
                    }
                    PurchaseInvoiceCreate.UpdateSummaryCalculation();
                },
                error: function (jqXHR, exception) {
                    console.log(exception + 'Uncaught Error.\n' + jqXHR.responseText);
                }
            });
        }
    }
    $("#TDS,#AddCostAmount2").trigger("change");
}

let getDiscountValue = 0;
let getTotalAmountValue = 0;
let getCGSTValue = 0;
let getSGSTValue = 0;
let getIGSTValue = 0;

function getValueTotal() {
    let getTotalValue = 0;
    $(".Total").each(function () {
        let currentValue = JSON.parse($(this).text());
        getTotalValue += currentValue;
    }).promise().then(function () {
        $(".rowtotalValue").text(getTotalValue.toFixed(2));
    });
}

function getDiscountTotal() {
    getDiscountValue = 0;
    $(".DiscountAmount").each(function () {
        let currentValue = JSON.parse($(this).text());
        getDiscountValue += currentValue;
    }).promise().then(function () {
        $(".rowTotalDiscAmount").text(getDiscountValue.toFixed(2));
    });
}
function getTaxableValueTotal() {
    let getTaxableValue = 0;
    $(".TotalAfterDisc").each(function () {
        let currentValue = JSON.parse($(this).text());
        getTaxableValue += currentValue;
    }).promise().then(function () {
        $(".rowTotalTaxableValue").text(getTaxableValue.toFixed(2));
    });
}

function getSGSTValueTotal() {
    getSGSTValue = 0;
    $(".SGSTAmount").each(function () {
        let currentValue = JSON.parse($(this).text());
        getSGSTValue += currentValue;
    }).promise().then(function () {
        $(".rowTotalSGSTAmount").text(getSGSTValue.toFixed(2));
    });
}
function getCGSTValueTotal() {
    getCGSTValue = 0;
    $(".CGSTAmount").each(function () {
        let currentValue = JSON.parse($(this).text());
        getCGSTValue += currentValue;
    }).promise().then(function () {
        $(".rowTotalCGSTAmount").text(getCGSTValue.toFixed(2));
    });
}
function getIGSTValueTotal() {
    getIGSTValue = 0;
    $(".IGSTAmount").each(function () {
        let currentValue = JSON.parse($(this).text());
        getIGSTValue += currentValue;
    }).promise().then(function () {
        $(".rowTotalIGSTAmount").text(getIGSTValue.toFixed(2));
    });
}
function getTotalAmountValueTotal() {
    getTotalAmountValue = 0;
    $(".NetTotal").each(function () {
        let currentValue = JSON.parse($(this).text());
        getTotalAmountValue += currentValue;
    }).promise().then(function () {
        $(".rowTotalAmount").text(getTotalAmountValue.toFixed(2));
    });
}

function getTransportTotalValue() {
    //$("#TransTotalAmount").text(JSON.parse($("#TranstotalValue").text()));
    //$("#InstallTotalAmount").text(JSON.parse($("#InstalltotalValue").text()));
    //$("#TotalTaxAmount").text(getCGSTValue + getSGSTValue + getIGSTValue);

    var TotalInvoiceValue = getTotalAmountValue + JSON.parse($("#TransTotalAmount").text()) + JSON.parse($("#InstalltotalValue").val());
    $("#TotalInvoiceValue").text(TotalInvoiceValue.toFixed(2));
    $("#TotalDiscountAmount").text(getDiscountValue.toFixed(2));
    $("#GrossAmount").text(TotalInvoiceValue - getDiscountValue);
    //$("#TotalCGST").text(getCGSTValue);
    //$("#TotalSGST").text(getSGSTValue);
    // $("#TotalIGST").text(getIGSTValue);
    //$("#FinalNetTotal").text(JSON.parse($("#GrossAmount").text()) + getCGSTValue + getSGSTValue + getIGSTValue);
}

function grandTotalCalc() {
    // Taxable value, discount, and base value
    var grandTotalTaxableValue = ($("#InstalltotalValue").val() * 1 + $("#TranstotalValue").val() * 1 + $("#rowTotalTaxableValue").text() * 1);
    $("#grandTotalTaxableValue").text(grandTotalTaxableValue.toFixed(2));

    var grandTotalDiscAmount = ($("#rowTotalDiscAmount").text() * 1);
    $("#grandTotalDiscAmount").text(grandTotalDiscAmount.toFixed(2));

    var grandTotalValue = ($("#rowtotalValue").text() * 1);
    $("#grandTotalValue").text(grandTotalValue.toFixed(2));

    // Aggregate tax amounts (SGST/CGST/IGST) across all rows, including transportation,
    // installation and advance payment, so summary tax matches line-level values.
    var totalSGST = 0, totalCGST = 0, totalIGST = 0;

    $(".SGSTAmount, .TransTotalSGSTAmount, .InstallTotalSGSTAmount, .AdvancePayAmtTotalSGSTAmount").each(function () {
        var v = parseFloat($(this).text() || "0");
        if (!isNaN(v)) totalSGST += v;
    });
    $(".CGSTAmount, .TransTotalCGSTAmount, .InstallTotalCGSTAmount, .AdvancePayAmtTotalCGSTAmount").each(function () {
        var v = parseFloat($(this).text() || "0");
        if (!isNaN(v)) totalCGST += v;
    });
    $(".IGSTAmount, .TransTotalIGSTAmount, .InstallTotalIGSTAmount, .AdvancePayAmtTotalIGSTAmount").each(function () {
        var v = parseFloat($(this).text() || "0");
        if (!isNaN(v)) totalIGST += v;
    });

    $("#grandTotalSGSTAmount").text(totalSGST.toFixed(2));
    $("#grandTotalCGSTAmount").text(totalCGST.toFixed(2));
    $("#grandTotalIGSTAmount").text(totalIGST.toFixed(2));

    // Transportation / installation / advance-payment totals (amount + tax)
    var grandTransTotalAmount = ($("#TranstotalValue").val() * 1 + $("#TransTotalSGSTAmount").text() * 1 + $("#TransTotalCGSTAmount").text() * 1 + $("#TransTotalIGSTAmount").text() * 1);
    $("#TransTotalAmount").text(grandTransTotalAmount.toFixed(2));

    var grandInstallTotalAmount = ($("#InstalltotalValue").val() * 1 + $("#InstallTotalSGSTAmount").text() * 1 + $("#InstallTotalCGSTAmount").text() * 1 + $("#InstallTotalIGSTAmount").text() * 1);
    $("#InstallTotalAmount").text(grandInstallTotalAmount.toFixed(2));

    var grandAdvancePayAmtTotalAmount = ($("#TotalAdvancePayment").val() * 1 + $("#AdvancePayAmtTotalSGSTAmount").text() * 1 + $("#AdvancePayAmtTotalCGSTAmount").text() * 1 + $("#AdvancePayAmtTotalIGSTAmount").text() * 1);
    $("#AdvancePayAmtTotalAmount").text(grandAdvancePayAmtTotalAmount.toFixed(2));

    // Grand total amount (include advance payment row as part of invoice value)
    var lineNetTotal = 0;
    $(".NetTotal").each(function () {
        var v = parseFloat($(this).text() || "0");
        if (!isNaN(v)) lineNetTotal += v;
    });
    //var grandTotalAmount = (lineNetTotal + grandTransTotalAmount + grandInstallTotalAmount) - grandAdvancePayAmtTotalAmount;
    //var grandTotalAmount = (lineNetTotal + grandTransTotalAmount + grandInstallTotalAmount) - grandAdvancePayAmtTotalAmount;
    var grandTotalAmount = (lineNetTotal + grandTransTotalAmount + grandInstallTotalAmount);
    $("#grandTotalAmount").text(grandTotalAmount.toFixed(2));
    $("#TotalInvoiceValue").text(grandTotalAmount.toFixed(2));

    // Final net total after other adjustment, additional cost, TDS/TCS
    var otherAdj = parseFloat($("#TotalOtherAdjustment").val() || "0");
    var addCost = parseFloat($("#AddCostAmount").val() || "0");
    var tdsAmt = parseFloat($("#TDSAmount").val() || "0");
    var tcsAmt = parseFloat($("#TCSAmount").val() || "0");

    // var FinalNetTotal = grandTotalAmount + otherAdj + addCost - tdsAmt + tcsAmt;
    var FinalNetTotal = (grandTotalAmount + otherAdj + addCost - tdsAmt + tcsAmt) - grandAdvancePayAmtTotalAmount;
    $("#FinalNetTotal").text(FinalNetTotal.toFixed(2));
    $("#FinalNetTotalPrint").text(FinalNetTotal.toFixed(2));

    var ItemTaxTotal = totalIGST + totalCGST + totalSGST;
    $("#ItemTaxTotal").html(ItemTaxTotal.toFixed(2));
}

function GetOtherAdjustmentTotal() {
    var TotalInvoiceValue = JSON.parse($("#TotalInvoiceValue").text());
    var TotalOtherAdjustment = JSON.parse($("#TotalOtherAdjustment").val());
    var AddCostAmount = JSON.parse($("#AddCostAmount").val());
    //var TDSAmount = $("#TDSAmount").val();
    var FinalNetTotal = (TotalInvoiceValue + TotalOtherAdjustment + AddCostAmount) - $("#TDSAmount").val() * 1 + $("#TCSAmount").val() * 1;// - TDSAmount & TCSAmount ;
    $("#FinalNetTotal").text(FinalNetTotal.toFixed(2));
}

//function GetPaymentDueDate() {
//    var InvoiceDate = $("#InvoiceDate").val();
//    if (InvoiceDate != null && InvoiceDate != undefined) {
//    }
//}

function getTotalRowAmount() {
    getValueTotal();
    getDiscountTotal();
    getTaxableValueTotal();
    getSGSTValueTotal();
    getCGSTValueTotal();
    getIGSTValueTotal();
    getTotalAmountValueTotal();
    //getTransportTotalValue();
    return true
}
$(window).bind('load', function () {
    //getTotalRowAmount().then(function () { grandTotalCalc() });
    $.when(getTotalRowAmount()).then(function () {
        grandTotalCalc()
    });

    var pathName = (window.location.pathname || "").toLowerCase();
    var isGRNInvoiceDetailsPage = pathName.indexOf("/purchaseinvoice/grninvoicedetailsbyid") >= 0;
    // Only force per-row recalculation based on location on editable
    // create pages; on GRNInvoiceDetailsById we keep the stored taxes
    // as-is and just use them for summary calculations.
    var shouldRecalculateForLocation = !isGRNInvoiceDetailsPage;
    PurchaseInvoiceCreate.RefreshLocationInfo(shouldRecalculateForLocation);

    if (parseFloat($("#TotalAdvancePayment").val()) > 0) {
        $("#advancePaymentTDS").prop('disabled', false);
        $("#advancePaymentTDSAmount").prop('disabled', false);
    }
    else {
        $("#advancePaymentTDS").prop('disabled', true);
        $("#advancePaymentTDSAmount").prop('disabled', true);
    }

    if (window.location.href.includes("isBack")) {
        $("#FromDate").val(sessionStorage.getItem("FromDate"));
        $("#ToDate").val(sessionStorage.getItem("ToDate"));
    }
    if (window.location.href.includes("isBack") && !!sessionStorage.getItem("FilterClicked") == true) {
        $("#filterSerchSec").show();
    }
    else {
        $("#filterSerchSec").hide();
    }
});

$("#TotalOtherAdjustment,#AddCostAmount").change(function () {
    GetOtherAdjustmentTotal();
});

//  calculation on changes of Price and validation - if entered price more than 10% from the old price, it should not allow.
$('.Price').change(function (e) {
    let $that = $(e.target).parents("tr");
    let oldPrice = parseFloat($('.oldPrice', $that).val());
    let newPrice = parseFloat($('.Price', $that).val());
    let maxPrice = oldPrice + (oldPrice * 10 / 100);
    if (newPrice > maxPrice) {
        toastr.warning("You can not enter Price more than 10% from the actual price!");
        $("#approvePurchaseInvoice").prop('disabled', true);
    }
    else {
        $("#approvePurchaseInvoice").prop('disabled', false);
    }
    calculationOnChangePriceAndQty(e);
});
$(".HSNCode").keypress(function (e) {
    //if the letter is not digit then display error and don't type anything
    if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57)) {
        //display error message
        return false;
    }
});

$('#GobackPI').click(function (e) {
    purchaseInvoiceFilterData(this);
});
function purchaseInvoiceFilterData(e) {
    $this = e;
    window.location.replace("/PurchaseInvoice/Index?isBack=" + true);
}
$('#filter').click(function () {
    $("#purchase-Invoice--loader").show();
    sessionStorage.setItem("FromDate", $("#FromDate").val());
    sessionStorage.setItem("ToDate", $("#ToDate").val());
    sessionStorage.setItem("InvoiceDate", $("#InvoiceDate").val());
    sessionStorage.setItem("searchText", $("#searchText").val());
    sessionStorage.setItem("FilterClicked", true);
});

$('#refreshPI,#refreshSearch').click(function () {
    $("#searchText").val("");
    sessionStorage.clear();
});
function calculationOnChangePriceAndQty(e) {
    taxcategory = $('#TaxCategory').val();
    if (taxcategory === "Inclusive") {
        PurchaseInvoiceCreate.InclusiveItemCalculation(e);
    }
    else {
        PurchaseInvoiceCreate.ItemCalculation(e);
    }
    PurchaseInvoiceCreate.UpdateSummaryCalculation();
}

$("#UpdatePI").click(function () {
    var gateDate = $("#updateGateEntryDate").val();
    var piId = $("#PurchaseInvoiceId").val();
    $.ajax({
        type: "POST",
        url: "/PurchaseInvoice/UpdatePurchaseInvoice?Id=" + piId + "&&GateEntryDate=" + gateDate,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("XSRF-TOKEN",
                $('input:hidden[name="__RequestVerificationToken"]').val());
        },
        contentType: "application/json; charset=utf-8",
        success: function (data) {
            debugger;
            if (data == "Success") {
                toastr.success("Data updated Successfully");
                window.location.replace('/PurchaseInvoice/Index');
            }
            else {
                toastr.error(data);
                window.location.reload();
            }
        },
        error: function (jqXHR, exception) {
            console.log(exception + 'Uncaught Error.\n' + jqXHR.responseText);
        }
    });
});


$(document).ready(function () {
    $("#PIInentoryItem tr").each(function () {
        var row = $(this);
        var inventoryId = row.find(".InventoryId").val();
        var centerId = $("#CenterId").val();

        if (inventoryId && centerId) {
            $.ajax({
                url: '/PurchaseInvoice/GetInventoryCategory',
                type: 'GET',
                data: { inventoryId: inventoryId, centerId: centerId },
                success: function (res) {
                    if (res.success && res.category === 'Lab Consumables') {
                        row.find("input[id='ExpiryDate']").prop('readonly', true);
                        row.find("input.BatchNumber").prop('readonly', true);
                    }
                },
                error: function (err) {
                    console.error("Error fetching inventory category", err);
                }
            });
        }
    });
});
$(document).ready(function () {
    console.log("Document is ready - Initializing PurchaseInvoiceCreate");
    PurchaseInvoiceCreate.Init();
});