import {
  useEffect,
  useRef,
  useState,
} from 'react';

import api, {
  errMsg,
  fmtSize,
  fmtDate,
  saveBlob,
} from '../api';

// ============================================================
// EXPIRY OPTIONS
// ============================================================

const EXPIRY = [
  {
    label: '15 minutes (temporary)',
    v: 15,
  },
  {
    label: '1 hour',
    v: 60,
  },
  {
    label: '24 hours',
    v: 1440,
  },
  {
    label: '7 days',
    v: 10080,
  },
  {
    label: '30 days',
    v: 43200,
  },
];

// ============================================================
// SHARE MODAL
// ============================================================

function ShareModal({
  file,
  share,
  onClose,
  onUpdated,
}) {
  const [f, setF] = useState({
    expiresInMinutes: 1440,
    allowedEmails: '',
    password: '',
    maxDownloads: '',
  });

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  // ----------------------------------------------------------
  // LOAD EXISTING SHARE SETTINGS
  // ----------------------------------------------------------

  useEffect(() => {
    if (share) {
      setF({
        expiresInMinutes:
          share.expiresInMinutes ||
          1440,

        allowedEmails:
          Array.isArray(
            share.allowedEmails
          )
            ? share.allowedEmails.join(
                ', '
              )
            : '',

        password: '',

        maxDownloads:
          share.maxDownloads > 0
            ? share.maxDownloads
            : '',
      });

      setResult(share);
    }
  }, [share]);

  // ----------------------------------------------------------
  // INPUT HANDLER
  // ----------------------------------------------------------

  const set = (key) => (e) => {
    setF((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  // ----------------------------------------------------------
  // CREATE / UPDATE
  // ----------------------------------------------------------

  const submit = async (e) => {
    e.preventDefault();

    setError('');
    setSaving(true);

    try {
      const allowedEmails =
        f.allowedEmails
          .split(',')
          .map((email) =>
            email.trim()
          )
          .filter(Boolean);

      const payload = {
        expiresInMinutes:
          Number(
            f.expiresInMinutes
          ),

        allowedEmails,

        maxDownloads:
          f.maxDownloads === ''
            ? 0
            : Number(
                f.maxDownloads
              ),
      };

      // Only send password when:
      // 1. Creating a share
      // 2. User entered a new password
      if (
        !share ||
        f.password.trim()
      ) {
        payload.password =
          f.password;
      }

      // ------------------------------------------------------
      // UPDATE EXISTING SHARE
      // ------------------------------------------------------

      if (share) {
        const response =
          await api.patch(
            `/shares/${share._id}`,
            payload
          );

        const updated =
          response.data.share;

        setResult(updated);

        if (onUpdated) {
          onUpdated(updated);
        }
      }

      // ------------------------------------------------------
      // CREATE NEW SHARE
      // ------------------------------------------------------

      else {
        const response =
          await api.post(
            '/shares',
            {
              ...payload,
              fileId: file._id,
            }
          );

        const created =
          response.data.share;

        setResult(created);

        if (onUpdated) {
          onUpdated(created);
        }
      }
    } catch (err) {
      setError(
        await errMsg(err)
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // SHARE LINK
  // ----------------------------------------------------------

  const link =
    result
      ? `${window.location.origin}/s/${result.code}`
      : '';

  // ----------------------------------------------------------
  // COPY SHARE CODE
  // ----------------------------------------------------------

  const copyCode = async () => {
    if (!result?.code) return;

    try {
      await navigator.clipboard.writeText(
        result.code
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        'Unable to copy share code'
      );
    }
  };

  // ----------------------------------------------------------
  // OPEN SETTINGS AGAIN
  // ----------------------------------------------------------

  const editSettings = () => {
    setResult(null);
  };

  return (
    <div
      className="overlay"
      onClick={onClose}
    >
      <div
        className="card modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* ==================================================
            TITLE
        ================================================== */}

        <h3>
          {share
            ? `Manage Share`
            : `Share "${file.originalName}"`}
        </h3>

        {/* ==================================================
            EXISTING SHARE / RESULT
        ================================================== */}

        {result ? (
          <>
            <p>
              Secure Code
            </p>

            <div className="copy">
              <input
                readOnly
                value={result.code}
              />

              <button
                type="button"
                className="btn"
                onClick={copyCode}
              >
                {copied
                  ? '✓ Code copied'
                  : '📋 Copy code'}
              </button>
            </div>

            {/* SHARE CODE */}

            <p>
              Share code:{' '}
              <code>
                {result.code}
              </code>
            </p>

            {/* EXPIRY */}

            <p className="muted">
              ⏰ Expires:{' '}
              {fmtDate(
                result.expiresAt
              )}
            </p>

            {/* PASSWORD */}

            <p className="muted">
              🔐 Password:{' '}
              {result.hasPassword
                ? 'Protected'
                : 'Not protected'}
            </p>

            {/* ACCESS */}

            <p className="muted">
              👥 Restricted users:{' '}

              {result.allowedEmails
                ?.length
                ? result.allowedEmails.join(
                    ', '
                  )
                : 'Any signed-in user with the link'}
            </p>

            {/* DOWNLOAD LIMIT */}

            <p className="muted">
              📥 Downloads:{' '}

              {result.downloadCount ||
                0}

              {' / '}

              {result.maxDownloads >
              0
                ? result.maxDownloads
                : 'Unlimited'}
            </p>

            {/* STATUS */}

            <p className="muted">
              Status:{' '}
              <strong>
                {result.status}
              </strong>
            </p>

            {/* BUTTONS */}

            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={copyCode}
              >
                {copied
                  ? '✓ Code copied'
                  : '📋 Copy code'}
              </button>

              <button
                type="button"
                className="btn"
                onClick={
                  editSettings
                }
              >
                ⚙️ Update Settings
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={
                  onClose
                }
              >
                Done
              </button>
            </div>
          </>
        ) : (
          /* ==================================================
             CREATE / UPDATE FORM
          ================================================== */

          <form
            onSubmit={submit}
          >
            {/* EXPIRY */}

            <label>
              ⏰ Expires after

              <select
                value={
                  f.expiresInMinutes
                }
                onChange={set(
                  'expiresInMinutes'
                )}
              >
                {EXPIRY.map(
                  (x) => (
                    <option
                      key={x.v}
                      value={x.v}
                    >
                      {x.label}
                    </option>
                  )
                )}
              </select>
            </label>

            {/* RESTRICTED USERS */}

            <label>
              👥 Restricted users (email addresses)

              <span className="muted">
                Separate addresses with commas. Leave empty to allow any signed-in user with the link.
              </span>

              <input
                placeholder="alice@example.com, bob@example.com"
                value={
                  f.allowedEmails
                }
                onChange={set(
                  'allowedEmails'
                )}
              />
            </label>

            {/* PASSWORD */}

            <label>
              🔐 Password

              <input
                type="password"
                placeholder={
                  share
                    ? 'Leave empty to keep current password'
                    : 'Optional password'
                }
                value={
                  f.password
                }
                onChange={set(
                  'password'
                )}
              />

              {share && (
                <span className="muted">
                  Enter a new
                  password to
                  replace the current
                  one.
                </span>
              )}
            </label>

            {/* DOWNLOAD LIMIT */}

            <label>
              📥 Download limit

              <input
                type="number"
                min="0"
                placeholder="Unlimited"
                value={
                  f.maxDownloads
                }
                onChange={set(
                  'maxDownloads'
                )}
              />

              <span className="muted">
                0 = unlimited,
                1 = one-time link
              </span>
            </label>

            {/* ERROR */}

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            {/* ACTIONS */}

            <div className="row">
              <button
                className="btn"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : share
                  ? '💾 Update Share'
                  : '🔗 Create Link'}
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={
                  onClose
                }
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FILES PAGE
// ============================================================

export default function Files() {
  const [files, setFiles] =
    useState([]);

  const [shares, setShares] =
    useState([]);

  const [usage, setUsage] =
    useState({
      used: 0,
      quota: 0,
    });

  const [sharing, setSharing] =
    useState(null);

  const [managingShare, setManagingShare] =
    useState(null);

  const [error, setError] =
    useState('');

  const [progress, setProgress] =
    useState(null);

  const input =
    useRef();

  // ==========================================================
  // LOAD FILES + SHARES
  // ==========================================================

  const load = async () => {
    try {
      const [
        filesResponse,
        sharesResponse,
      ] = await Promise.all([
        api.get('/files'),
        api.get('/shares'),
      ]);

      setFiles(
        filesResponse.data.files
      );

      setUsage(
        filesResponse.data
      );

      setShares(
        sharesResponse.data.shares
      );
    } catch (err) {
      setError(
        await errMsg(err)
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ==========================================================
  // FIND ACTIVE SHARE FOR FILE
  // ==========================================================

  const getShareForFile = (
    fileId
  ) => {
    return shares.find(
      (share) =>
        String(
          share.fileId
        ) === String(fileId) &&
        share.status ===
          'active'
    );
  };

  // ==========================================================
  // UPLOAD
  // ==========================================================

  const upload = async (e) => {
    const file =
      e.target.files[0];

    if (!file) return;

    const fd =
      new FormData();

    fd.append(
      'file',
      file
    );

    setError('');

    try {
      await api.post(
        '/files',
        fd,
        {
          onUploadProgress: (
            p
          ) => {
            if (p.total) {
              setProgress(
                Math.round(
                  (p.loaded /
                    p.total) *
                    100
                )
              );
            }
          },
        }
      );

      await load();
    } catch (err) {
      setError(
        await errMsg(err)
      );
    }

    setProgress(null);

    if (input.current) {
      input.current.value =
        '';
    }
  };

  // ==========================================================
  // DOWNLOAD FILE
  // ==========================================================

  const download = async (
    file
  ) => {
    try {
      const response =
        await api.get(
          `/files/${file._id}/download`,
          {
            responseType:
              'blob',
          }
        );

      saveBlob(
        response.data,
        file.originalName
      );
    } catch (err) {
      setError(
        await errMsg(err)
      );
    }
  };

  // ==========================================================
  // DELETE FILE
  // ==========================================================

  const remove = async (
    file
  ) => {
    if (
      !confirm(
        `Delete "${file.originalName}"? Active share links will be revoked.`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/files/${file._id}`
      );

      await load();
    } catch (err) {
      setError(
        await errMsg(err)
      );
    }
  };

  // ==========================================================
  // SHARE CREATED / UPDATED
  // ==========================================================

  const handleShareUpdated = (
    updatedShare
  ) => {
    setShares((previous) => {
      const exists =
        previous.some(
          (share) =>
            String(
              share._id
            ) ===
            String(
              updatedShare._id
            )
        );

      if (exists) {
        return previous.map(
          (share) =>
            String(
              share._id
            ) ===
            String(
              updatedShare._id
            )
              ? updatedShare
              : share
        );
      }

      return [
        updatedShare,
        ...previous,
      ];
    });
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      {/* ====================================================
          PAGE HEADER
      ==================================================== */}

      <div className="row between">
        <h2>My Files</h2>

        <div>
          <input
            ref={input}
            type="file"
            hidden
            onChange={
              upload
            }
          />

          <button
            className="btn"
            onClick={() =>
              input.current?.click()
            }
            disabled={
              progress !== null
            }
          >
            {progress !==
            null
              ? `Uploading ${progress}%`
              : '⬆ Upload file'}
          </button>
        </div>
      </div>

      {/* ====================================================
          STORAGE
      ==================================================== */}

      <p className="muted">
        🔐 Files are encrypted
        (AES-256-GCM) at rest.

        {' '}

        Storage:{' '}

        {fmtSize(
          usage.used
        )}

        {' / '}

        {fmtSize(
          usage.quota
        )}
      </p>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* ====================================================
          FILE TABLE
      ==================================================== */}

      <div className="card">
        {files.length ===
        0 ? (
          <p className="muted">
            No files yet —
            upload your first
            file.
          </p>
        ) : (
          <table className="files-table">
            <thead>
              <tr>
                <th>
                  Name
                </th>

                <th>
                  Size
                </th>

                <th>
                  Uploaded
                </th>

                <th>
                  Share
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {files.map(
                (file) => {
                  const share =
                    getShareForFile(
                      file._id
                    );

                  return (
                    <tr
                      key={
                        file._id
                      }
                    >
                      {/* NAME */}

                      <td>
                        {file.originalName}
                      </td>

                      {/* SIZE */}

                      <td>
                        {fmtSize(
                          file.size
                        )}
                      </td>

                      {/* UPLOADED */}

                      <td>
                        {fmtDate(
                          file.createdAt
                        )}
                      </td>

                      {/* SHARE STATUS */}

                      <td>
                        {share ? (
                          <div>
                            <small className="muted">
                              {share.downloadCount ||
                                0}

                              {' / '}

                              {share.maxDownloads >
                              0
                                ? share.maxDownloads
                                : '∞'}
                            </small>
                          </div>
                        ) : (
                          <span className="muted">
                            Not shared
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}

                      <td className="actions">
                        {/* CREATE SHARE */}

                        {!share && (
                          <button
                            className="btn sm"
                            onClick={() =>
                              setSharing(
                                file
                              )
                            }
                          >
                            🔗 Share
                          </button>
                        )}

                        {/* MANAGE SHARE */}

                        {share && (
                          <>
                            <button
                              className="btn sm"
                              onClick={() =>
                                setManagingShare(
                                  share
                                )
                              }
                            >
                              ⚙️ Manage
                            </button>

                            {/* COPY SHARE CODE */}

                            <button
                              className="btn sm ghost"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    share.code
                                  );

                                  alert(
                                    '✓ Share code copied!'
                                  );
                                } catch {
                                  setError(
                                    'Unable to copy share code'
                                  );
                                }
                              }}
                            >
                              📋 Copy code
                            </button>
                          </>
                        )}

                        {/* DOWNLOAD */}

                        <button
                          className="btn sm ghost"
                          onClick={() =>
                            download(
                              file
                            )
                          }
                        >
                          Download
                        </button>

                        {/* DELETE */}

                        <button
                          className="btn sm danger"
                          onClick={() =>
                            remove(
                              file
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ====================================================
          CREATE SHARE MODAL
      ==================================================== */}

      {sharing && (
        <ShareModal
          file={sharing}
          onClose={() =>
            setSharing(null)
          }
          onUpdated={
            handleShareUpdated
          }
        />
      )}

      {/* ====================================================
          MANAGE EXISTING SHARE MODAL
      ==================================================== */}

      {managingShare && (
        <ShareModal
          file={files.find(
            (file) =>
              String(
                file._id
              ) ===
              String(
                managingShare.fileId
              )
          )}
          share={
            managingShare
          }
          onClose={() =>
            setManagingShare(
              null
            )
          }
          onUpdated={
            handleShareUpdated
          }
        />
      )}
    </>
  );
}