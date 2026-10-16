// Red message under a field on the dark sign-in/registration cards.
// (White cards use Bootstrap's .invalid-feedback instead.)
const FieldError = ({ id, message }) =>
  message ? (
    <span id={id} className="small d-block mt-1" style={{ fontSize: '12px', color: '#f87171' }}>
      {message}
    </span>
  ) : null;

export default FieldError;
