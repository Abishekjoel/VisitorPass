/**
 * Visitor Registration Controller
 * Form validation, dynamic error handling, API submission, and pass generation.
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("visitor-registration-form");
  const clearBtn = document.getElementById("btn-clear-form");

  if (clearBtn && form) {
    clearBtn.addEventListener("click", () => {
      form.reset();
      clearValidationErrors();
      App.toastInfo("Form Reset", "All registration input fields have been cleared.");
    });
  }

  if (form) {
    // Clear validation error when user types
    form.querySelectorAll(".form-control").forEach(input => {
      input.addEventListener("input", () => {
        input.classList.remove("is-invalid");
      });
      input.addEventListener("change", () => {
        input.classList.remove("is-invalid");
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearValidationErrors();

      const isValid = validateRegistrationForm();
      if (!isValid) {
        App.toastWarning("Validation Error", "Please fill in all required fields marked with an asterisk (*).");
        return;
      }

      const submitBtn = document.getElementById("btn-submit-registration");
      const btnText = document.getElementById("submit-btn-text");
      const btnSpinner = document.getElementById("submit-btn-spinner");

      try {
        submitBtn.disabled = true;
        btnText.style.display = "none";
        btnSpinner.style.display = "inline-flex";

        const formData = {
          full_name: document.getElementById("full_name").value.trim(),
          phone: document.getElementById("phone").value.trim(),
          email: document.getElementById("email").value.trim(),
          organization: document.getElementById("organization").value.trim(),
          person_to_visit: document.getElementById("person_to_visit").value.trim(),
          purpose: document.getElementById("purpose").value.trim(),
          id_type: document.getElementById("id_type").value.trim(),
          id_number: document.getElementById("id_number").value.trim(),
          vehicle_number: document.getElementById("vehicle_number").value.trim() || null,
          address: document.getElementById("address").value.trim() || null,
          notes: document.getElementById("notes").value.trim() || null
        };

        const newVisitor = await App.fetchAPI("/visitors", {
          method: "POST",
          body: JSON.stringify(formData)
        });

        App.toastSuccess(
          "Registration Successful",
          `Visitor "${newVisitor.full_name}" registered! Issued Visitor ID: ${newVisitor.visitor_id}`
        );

        // Reset the form
        form.reset();
        App.updateInsideBadgeCount();

        // Immediately display the official visitor pass badge modal
        App.showPassModal(newVisitor);

      } catch (err) {
        App.toastError("Registration Failed", err.message || "Failed to register visitor.");
      } finally {
        submitBtn.disabled = false;
        btnText.style.display = "inline-flex";
        btnSpinner.style.display = "none";
      }
    });
  }
});

function clearValidationErrors() {
  document.querySelectorAll(".form-control.is-invalid").forEach(el => {
    el.classList.remove("is-invalid");
  });
}

function validateRegistrationForm() {
  let valid = true;

  const requiredFields = [
    { id: "full_name", minLen: 2 },
    { id: "organization", minLen: 2 },
    { id: "person_to_visit", minLen: 2 },
    { id: "purpose", minLen: 2 },
    { id: "id_type", minLen: 2 },
    { id: "id_number", minLen: 2 }
  ];

  requiredFields.forEach(field => {
    const el = document.getElementById(field.id);
    if (!el || el.value.trim().length < field.minLen) {
      el.classList.add("is-invalid");
      valid = false;
    }
  });

  // Phone validation (min 7 digits)
  const phoneEl = document.getElementById("phone");
  const phoneDigits = phoneEl.value.replace(/\D/g, "");
  if (!phoneEl.value.trim() || phoneDigits.length < 7) {
    phoneEl.classList.add("is-invalid");
    valid = false;
  }

  // Email validation regex
  const emailEl = document.getElementById("email");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailEl.value.trim() || !emailRegex.test(emailEl.value.trim())) {
    emailEl.classList.add("is-invalid");
    valid = false;
  }

  return valid;
}
