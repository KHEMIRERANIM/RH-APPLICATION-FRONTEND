/* eslint-disable */
export const user = {
    id    : 'cfaad35d-07a3-4447-a6c3-d8c3d54fd5df',
    name  : 'Jean Dupont',
    email : 'jean.dupont@entreprise.com',
    avatar: 'assets/images/avatars/brian-hughes.jpg',
    status: 'online',
    role  : 'admin' as 'admin' | 'employe' | 'candidat'
};

export const userEmploye = {
    ...user,
    id    : 'employe-001',
    name  : 'Marie Martin',
    email : 'marie.martin@entreprise.com',
    role  : 'employe' as const
};

export const userCandidat = {
    ...user,
    id    : 'candidat-001',
    name  : 'Pierre Bernard',
    email : 'pierre.bernard@email.com',
    role  : 'candidat' as const
};
