import { useNovelContext } from '@/contexts/NovelContext';
import Dashboard from '@/components/novel/Dashboard';
import NovelWorkspace from '@/components/novel/NovelWorkspace';

const Index = () => {
  const { activeNovel } = useNovelContext();

  if (activeNovel) {
    return <NovelWorkspace />;
  }

  return <Dashboard />;
};

export default Index;
