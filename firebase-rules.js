// Regras de Segurança do Firestore
// Cole isso no Firebase Console > Firestore Database > Regras

rules_version = "2"
\
service cloud.firestore
{
  match / databases / { database } / documents
  // Permitir que usuários leiam e escrevam seus próprios dados
  match / artifacts / digital - slate - app / users / { userId } / { document=** }
  allow
  read, write
  :
  if request.auth != null && request.auth.uid == userId;

  // Negar todo o resto
  match / { document=** }
  allow
  read, write
  :
  if false;
}
