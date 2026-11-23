import { useState, useRef, useEffect, useId } from 'react';

/**
 * SearchableSelect
 * A name-based search and selection combobox that completely hides technical database IDs.
 *
 * Props:
 * - id: unique html id
 * - label: label text (optional)
 * - options: Array<{ id: string|number, name: string, subtitle?: string, badge?: string }>
 * - value: currently selected id (string|number)
 * - onChange: callback(selectedId, selectedOption)
 * - placeholder: input placeholder
 * - disabled: boolean
 * - required: boolean
 * - error: error message string
 */
export default function SearchableSelect({
  id: customId,
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Type to search by name...',
  disabled = false,
  required = false,
  error = '',
}) {
  const generatedId = useId();
  const inputId = customId || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Find currently selected option
  const selectedOption = options.find(
    opt => String(opt.id) === String(value)
  );

  // Filter options based on search term
  const filteredOptions = options.filter(opt => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = opt.name?.toLowerCase().includes(term);
    const subtitleMatch = opt.subtitle?.toLowerCase().includes(term);
    return nameMatch || subtitleMatch;
  });

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = opt => {
    onChange(opt.id, opt);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = e => {
    e.stopPropagation();
    onChange('', null);
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = e => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-wrap ${disabled ? 'disabled' : ''} ${error ? 'invalid' : ''}`}
      style={{ position: 'relative', width: '100%' }}
    >
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            marginBottom: '6px',
            color: '#cbd5e1',
            fontSize: '0.86rem',
            fontWeight: 650,
          }}
        >
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}

      {/* Input / Display box */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(11, 24, 18, 0.85)',
          border: error ? '1px solid var(--danger)' : '1px solid rgba(52, 211, 153, 0.24)',
          borderRadius: 11,
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4)',
          transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
        }}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            if (inputRef.current) inputRef.current.focus();
          }
        }}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={selectedOption ? selectedOption.name : placeholder}
          value={isOpen ? searchTerm : (selectedOption ? selectedOption.name : '')}
          onChange={e => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: '10px 40px 10px 14px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: selectedOption && !isOpen ? 'var(--green-light)' : '#f8fafc',
            fontWeight: selectedOption && !isOpen ? 650 : 400,
            fontSize: '0.94rem',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />

        {/* Action icons: Clear button or chevron */}
        <div
          style={{
            position: 'absolute',
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                padding: '2px 4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}

          <span
            style={{
              color: 'var(--muted)',
              fontSize: '10px',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.16s ease',
              pointerEvents: 'none',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Selected badge details underneath if subtitle exists */}
      {!isOpen && selectedOption?.subtitle && (
        <div
          style={{
            marginTop: 4,
            fontSize: '0.8rem',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>✓ Selected:</span>
          <span style={{ color: '#cbd5e1' }}>{selectedOption.subtitle}</span>
          {selectedOption.badge && (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(52, 211, 153, 0.12)',
                color: 'var(--green-light)',
              }}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>
      )}

      {/* Dropdown menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 999,
            maxHeight: 240,
            overflowY: 'auto',
            background: 'rgba(10, 22, 16, 0.98)',
            border: '1px solid rgba(0, 240, 152, 0.35)',
            borderRadius: 12,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 201, 120, 0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {filteredOptions.length === 0 ? (
            <div
              style={{
                padding: '14px 16px',
                color: 'var(--muted)',
                fontSize: '0.88rem',
                textAlign: 'center',
              }}
            >
              No matching records found.
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.id) === String(value);
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isHighlighted
                      ? 'rgba(0, 201, 120, 0.15)'
                      : isSelected
                      ? 'rgba(0, 201, 120, 0.08)'
                      : 'transparent',
                    borderLeft: isHighlighted
                      ? '3px solid var(--green-glow)'
                      : '3px solid transparent',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: isSelected ? 'var(--green-glow)' : '#f8fafc',
                        fontWeight: isSelected ? 750 : 600,
                        fontSize: '0.92rem',
                      }}
                    >
                      {opt.name}
                    </div>

                    {opt.subtitle && (
                      <div
                        style={{
                          color: 'var(--muted)',
                          fontSize: '0.78rem',
                          marginTop: 2,
                        }}
                      >
                        {opt.subtitle}
                      </div>
                    )}
                  </div>

                  {opt.badge && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: 'rgba(52, 211, 153, 0.14)',
                        color: 'var(--green-light)',
                        fontWeight: 700,
                        marginLeft: 8,
                        flexShrink: 0,
                      }}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 5,
            color: '#fca5a5',
            fontSize: '0.84rem',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
