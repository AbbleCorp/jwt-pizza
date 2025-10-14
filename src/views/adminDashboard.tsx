import React from 'react';
import View from './view';
import { useNavigate } from 'react-router-dom';
import NotFound from './notFound';
import Button from '../components/button';
import { pizzaService } from '../service/service';
import { Franchise, FranchiseList, Role, Store, User } from '../service/pizzaService';
import { TrashIcon } from '../icons';

interface Props {
  user: User | null;
}

export default function AdminDashboard(props: Props) {
  const navigate = useNavigate();

  // Franchises
  const [franchiseList, setFranchiseList] = React.useState<FranchiseList>({ franchises: [], more: false });
  const [franchisePage, setFranchisePage] = React.useState(0);

  // Users
  const [userList, setUserList] = React.useState<User[]>([]);
  const [userPage, setUserPage] = React.useState(1);
  const [hasMoreUsers, setHasMoreUsers] = React.useState(false);
  const [userFilter, setUserFilter] = React.useState('*');

  const filterFranchiseRef = React.useRef<HTMLInputElement>(null);
  const filterUserRef = React.useRef<HTMLInputElement>(null);

  // Fetch franchises and users
  React.useEffect(() => {
    (async () => {
      const franchises = await pizzaService.getFranchises(franchisePage, 3, '*');
      setFranchiseList(franchises);

      const usersResponse = await pizzaService.getUsers(userPage, 10, userFilter);
      setUserList(usersResponse.users);
      setHasMoreUsers(usersResponse.hasMore);
    })();
  }, [props.user, franchisePage, userPage, userFilter]);

  // Navigation helpers
  const createFranchise = () => navigate('/admin-dashboard/create-franchise');
  const closeFranchise = (franchise: Franchise) => navigate('/admin-dashboard/close-franchise', { state: { franchise } });
  const closeStore = (franchise: Franchise, store: Store) => navigate('/admin-dashboard/close-store', { state: { franchise, store } });
  const filterFranchises = async () => {
    const nameFilter = `*${filterFranchiseRef.current?.value || ''}*`;
    setFranchiseList(await pizzaService.getFranchises(franchisePage, 10, nameFilter));
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    await pizzaService.deleteUser({ id: userId });
    const usersResponse = await pizzaService.getUsers(userPage, 10, userFilter);
    setUserList(usersResponse.users);
    setHasMoreUsers(usersResponse.hasMore);

    // If page became empty, move back one page
    if (usersResponse.users.length === 0 && userPage > 1) {
      setUserPage(userPage - 1);
    }
  };

  // Render
  if (!Role.isRole(props.user, Role.Admin)) return <NotFound />;

  return (
    <View title="Mama Ricci's kitchen">
      <div className="text-start py-8 px-4 sm:px-6 lg:px-8">
        {/* Users Table */}
        <h3 className="text-neutral-100 text-xl mb-4">Users</h3>
        <div className="bg-neutral-100 overflow-clip my-4">
          <div className="flex flex-col">
            <div className="-m-1.5 overflow-x-auto">
              <div className="p-1.5 min-w-full inline-block align-middle">
                <div className="">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                      <tr>
                        {['Name', 'Email', 'Role', 'Action'].map((header) => (
                          <th key={header} scope="col" className="px-6 py-3 text-center text-xs font-medium">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {userList.map((user) => (
                        <tr key={user.id} className="bg-neutral-100">
                          <td className="text-start px-6 py-2 whitespace-nowrap text-sm text-gray-800">{user.name}</td>
                          <td className="text-start px-6 py-2 whitespace-nowrap text-sm text-gray-800">{user.email}</td>
                          <td className="text-start px-6 py-2 whitespace-nowrap text-sm text-gray-800">{user.roles?.map(r => r.role).join(', ')}</td>
                          <td className="px-6 py-2 whitespace-nowrap text-end text-sm font-medium">
                            <button
                              type="button"
                              className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                              onClick={() => deleteUser(user.id)}
                            >
                              <TrashIcon /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="px-1 py-1" colSpan={2}>
                          <input
                            type="text"
                            ref={filterUserRef}
                            placeholder="Filter users"
                            className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                          />
                          <button
                            type="button"
                            className="ml-2 px-2 py-1 text-sm font-semibold rounded-lg border border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                            onClick={() => {
                              setUserPage(1);
                              setUserFilter(`*${filterUserRef.current?.value || ''}*`);
                            }}
                          >
                            Search
                          </button>
                        </td>
                        <td colSpan={2} className="text-end text-sm font-medium">
                          <button
                            type="button"
                            className="w-12 p-1 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 m-1 hover:bg-orange-200 disabled:bg-neutral-300 disabled:text-gray-400"
                            onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
                            disabled={userPage <= 1}
                          >
                            «
                          </button>
                          <button
                            type="button"
                            className="w-12 p-1 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 m-1 hover:bg-orange-200 disabled:bg-neutral-300 disabled:text-gray-400"
                            onClick={() => setUserPage(prev => prev + 1)}
                            disabled={!hasMoreUsers}
                          >
                            »
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Franchises Table (unchanged) */}
        <h3 className="text-neutral-100 text-xl">Franchises</h3>
        <div className="bg-neutral-100 overflow-clip my-4">
          {/* ... franchise table code unchanged ... */}
        </div>
      </div>

      <div>
        <Button className="w-36 text-xs sm:text-sm sm:w-64" title="Add Franchise" onPress={createFranchise} />
      </div>
    </View>
  );
}
