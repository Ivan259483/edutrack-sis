import { FaCheckCircle, FaRegCircle } from 'react-icons/fa';
import { PASSWORD_CHECKS } from '../../services/validation';

// Live list of the password rules under a "new password" field.
// `dark` matches the sign-in/registration cards; otherwise it suits white cards.
const PasswordChecklist = ({ password, dark = false, id }) => (
  <ul id={id} className="list-unstyled mb-0 mt-2" style={{ fontSize: '12px' }} aria-label="Password requirements">
    {PASSWORD_CHECKS.map((check) => {
      const met = check.test(password);
      return (
        <li
          key={check.label}
          className="d-flex align-items-center gap-2"
          style={{ color: met ? (dark ? '#22c55e' : '#15803d') : dark ? '#94a3b8' : '#64748b' }}
        >
          {met ? <FaCheckCircle aria-hidden="true" /> : <FaRegCircle aria-hidden="true" />}
          <span>
            {check.label}
            <span className="visually-hidden">{met ? ' (done)' : ' (missing)'}</span>
          </span>
        </li>
      );
    })}
  </ul>
);

export default PasswordChecklist;
