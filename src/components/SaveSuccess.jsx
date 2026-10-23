import { motion, useReducedMotion } from 'framer-motion';
import { t } from '../strings';

export default function SaveSuccess() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="success"
      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="var(--green)" strokeWidth="4" />
        <motion.path
          d="M20 33 L29 42 L45 24"
          fill="none"
          stroke="var(--green)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        />
      </svg>
      <div className="success-text" role="status">{t.saved}</div>
    </motion.div>
  );
}