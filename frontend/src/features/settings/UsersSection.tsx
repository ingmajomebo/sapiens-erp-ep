import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Select } from '../../shared/helpers'
import { Button } from '../../shared/Button'
import { toast } from '../../shared/toast'
import { usersApi, type UserDto } from './api/usersApi'
import { rolesApi } from './api/rolesApi'
import type { RoleDto } from './api/rolesApi'
import styles from './UsersSection.module.css'

const MIN_PASSWORD = 10

type Draft = { name: string; email: string; password: string; roleId: string }

const EMPTY: Draft = { name: '', email: '', password: '', roleId: '' }

/**
 * Alta y mantenimiento de los usuarios del ERP.
 *
 * El primer administrador nace de las variables de entorno del despliegue.
 * A partir de ahí los usuarios se crean aquí: las credenciales de cada
 * persona nunca pasan por un archivo de configuración ni por el pipeline.
 */
export function UsersSection() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [editing, setEditing] = useState<UserDto | null>(null)
  const [error, setError] = useState('')

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.listAll })
  const { data: roles = [] } = useQuery<RoleDto[]>({ queryKey: ['roles'], queryFn: rolesApi.listRoles })

  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] })
  const fail = (err: unknown, fallback: string) => {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    setError(msg ?? fallback)
  }

  const createMut = useMutation({
    mutationFn: () => usersApi.create(draft),
    onSuccess: () => {
      refresh(); setDraft(EMPTY); setError('')
      toast('Usuario creado. Entrégale la contraseña por un canal seguro.', 'success')
    },
    onError: err => fail(err, 'No se pudo crear el usuario'),
  })

  const updateMut = useMutation({
    mutationFn: (u: UserDto) => usersApi.update(u.id, {
      name: u.name, email: u.email, roleId: u.roleId, enabled: u.enabled,
    }),
    onSuccess: () => { refresh(); setEditing(null); setError(''); toast('Usuario actualizado', 'success') },
    onError: err => fail(err, 'No se pudo actualizar'),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { refresh(); toast('Usuario desactivado', 'success') },
    onError: err => fail(err, 'No se pudo desactivar'),
  })

  const resetMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id, password),
    onSuccess: () => toast('Contraseña cambiada. Entrégasela por un canal seguro.', 'success'),
    onError: err => fail(err, 'No se pudo cambiar la contraseña'),
  })

  function handleReset(user: UserDto) {
    const password = prompt(`Nueva contraseña para ${user.name} (mínimo ${MIN_PASSWORD} caracteres):`)
    if (!password) return
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`)
      return
    }
    resetMut.mutate({ id: user.id, password })
  }

  const canCreate = draft.name.trim() && draft.email.trim()
    && draft.password.length >= MIN_PASSWORD && draft.roleId

  return (
    <Card>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Usuarios del sistema</div>
          <div className={styles.sub}>
            Cada persona entra con su propio correo y su rol. Así queda registrado
            quién hizo cada movimiento, y dar de baja a alguien no obliga a cambiarle
            la contraseña al resto.
          </div>
        </div>
      </div>

      {isLoading && <div className={styles.empty}>Cargando…</div>}

      {!isLoading && users.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Persona</th><th>Rol</th><th>Último ingreso</th><th />
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isEditing = editing?.id === u.id
              return (
                <tr key={u.id} className={u.enabled ? undefined : styles.inactive}>
                  <td>
                    {isEditing ? (
                      <input className={styles.input} value={editing.name}
                        onChange={e => setEditing({ ...editing, name: e.target.value })} />
                    ) : (
                      <>
                        <div className={styles.name}>{u.name}</div>
                        <div className={styles.email}>{u.email}</div>
                      </>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <Select
                        style={{ minWidth: 150 }}
                        value={editing.roleId}
                        onChange={v => setEditing({ ...editing, roleId: v })}
                        options={roles.map(r => ({ value: r.id, label: r.name }))}
                      />
                    ) : u.roleName}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-CO') : 'Nunca'}
                    {!u.enabled && ' · desactivado'}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {isEditing ? (
                        <>
                          <Button variant="primary" size="sm"
                            onClick={() => updateMut.mutate(editing)}>Guardar</Button>
                          <Button variant="ghost" size="sm"
                            onClick={() => { setEditing(null); setError('') }}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleReset(u)}>Contraseña</Button>
                          {u.enabled && (
                            <Button variant="ghost" size="sm"
                              onClick={() => {
                                if (confirm(`¿Desactivar a ${u.name}? No podrá volver a entrar.`))
                                  deactivateMut.mutate(u.id)
                              }}>Desactivar</Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div className={styles.form}>
        <div className={styles.title} style={{ marginBottom: 14 }}>Agregar una persona</div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="u-name">Nombre</label>
            <input id="u-name" className={styles.input} value={draft.name}
              onChange={e => { setDraft({ ...draft, name: e.target.value }); setError('') }} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="u-email">Correo</label>
            <input id="u-email" type="email" className={styles.input} value={draft.email}
              onChange={e => { setDraft({ ...draft, email: e.target.value }); setError('') }} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="u-pass">Contraseña inicial</label>
            <input id="u-pass" type="text" className={styles.input} value={draft.password}
              onChange={e => { setDraft({ ...draft, password: e.target.value }); setError('') }} />
            <span className={styles.hint}>
              Mínimo {MIN_PASSWORD} caracteres. Se muestra a propósito: tienes que
              poder entregársela.
            </span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Rol</label>
            <Select
              value={draft.roleId}
              onChange={v => { setDraft({ ...draft, roleId: v }); setError('') }}
              options={[
                { value: '', label: 'Seleccionar rol…' },
                ...roles.map(r => ({ value: r.id, label: r.name })),
              ]}
            />
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.formActions}>
          <Button variant="primary" disabled={!canCreate} loading={createMut.isPending}
            onClick={() => createMut.mutate()}>
            Crear usuario
          </Button>
        </div>
      </div>
    </Card>
  )
}
