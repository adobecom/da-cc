export function requiredFieldMessage() {
  return window.mph?.['nonprofit-field-required'] || 'This field is required.';
}

export function requiredLegendText() {
  return window.mph?.['nonprofit-required-legend'] || '* Required field';
}

export function missingFieldsMessage(labels) {
  const prefix = window.mph?.['nonprofit-missing-fields-prefix']
    || 'Please complete the following required fields to continue:';
  return `${prefix} ${labels.join(', ')}`;
}

export function markRequiredLabel(createTag, labelTag) {
  const indicatorTag = createTag(
    'span',
    { class: 'np-required-indicator', 'aria-hidden': 'true' },
    ' *',
  );
  labelTag.append(indicatorTag);
}

export function createFieldErrorTag(createTag, name) {
  return createTag('span', {
    id: `${name}-error`,
    class: 'np-field-error',
    'aria-live': 'polite',
  });
}

export function setFieldInvalid(displayTag, errorTag, message = requiredFieldMessage()) {
  displayTag.setAttribute('aria-invalid', 'true');
  displayTag.classList.add('np-error');
  if (errorTag) errorTag.textContent = message;
}

export function clearFieldInvalid(displayTag, errorTag) {
  displayTag.removeAttribute('aria-invalid');
  displayTag.classList.remove('np-error');
  if (errorTag) errorTag.textContent = '';
}

export function setSubmitEnabled(submitButtonTag, enabled) {
  if (enabled) submitButtonTag.removeAttribute('aria-disabled');
  else submitButtonTag.setAttribute('aria-disabled', 'true');
}

export function getRequiredLegendTag(createTag) {
  return createTag('p', { class: 'np-required-legend' }, requiredLegendText());
}
