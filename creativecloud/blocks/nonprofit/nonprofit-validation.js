export function markRequiredLabel(createTag, labelTag) {
  const indicatorTag = createTag(
    'span',
    { class: 'np-required-indicator', 'aria-hidden': 'true' },
    ' *',
  );
  labelTag.append(indicatorTag);
}

export function setFieldInvalid(displayTag) {
  displayTag.setAttribute('aria-invalid', 'true');
  displayTag.classList.add('np-error');
}

export function clearFieldInvalid(displayTag) {
  displayTag.removeAttribute('aria-invalid');
  displayTag.classList.remove('np-error');
}

export function setSubmitEnabled(submitButtonTag, enabled) {
  if (enabled) submitButtonTag.removeAttribute('aria-disabled');
  else submitButtonTag.setAttribute('aria-disabled', 'true');
}
