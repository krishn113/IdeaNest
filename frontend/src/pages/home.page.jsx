import { useEffect, useState } from "react";
import axios from "axios";
import AnimationWrapper from "../common/page-animation";
import InPageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import BlogPostCard from "../components/blog-post.component";
import NoDataMessage from "../components/nodata.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import LoadMoreDataBtn from "../components/load-more.component";

const HomePage = () => {

    let [blogs, setBlog] = useState(null);
    let [trendingblogs, setTrendingBlog] = useState(null);
    let [pageState, setPageState] = useState("home");

    let categories = [
    "Web Development",
    "Mobile Applications",
    "Machine Learning",
    "Data Science",
    "Cybersecurity",
    "Social Good",
    "DevOps",
    "Game Development",
    "System Projects",
    "Blockchain"
    ];

    const fetchLatestBlogs = ({page = 1}) => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs", {page})
        .then( async ({data}) => {

            let formattedData = await filterPaginationData({
                state: blogs,
                data: data.blogs,
                page,
                countRoute: "/all-latest-blogs-count"
            });
            setBlog(formattedData);
        })
        .catch(err =>{
            console.log(err)
        })
    }

    const fetchBlogByCategory = ({page = 1}) => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {tag : pageState, page})
        .then(async ({data}) => {
            let formattedData = await filterPaginationData({
                state: blogs,
                data: data.blogs,
                page,
                countRoute: "/search-blogs-count",
                data_to_send: {tag : pageState}
            });
        })
        .catch(err =>{
            console.log(err)
        })
    }
    const fetchTrendingBlogs = () => {
        axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs")
        .then(({data}) => {
            setTrendingBlog(data.blogs);
        })
        .catch(err =>{
            console.log(err)
        })
    }

    const loadBlogByCategory = (e) =>{
        let category  = e.target.innerText.toLowerCase();

        setBlog(null);

        if(pageState == category){
            setPageState("home");
            return;
        }

        setPageState(category);
    
    }


    useEffect(() => {

        if(pageState == "home"){
            fetchLatestBlogs({page: 1});
        }else{
            fetchBlogByCategory({page: 1});
        }
        if(!trendingblogs){
            fetchTrendingBlogs();
        }
    }, [pageState])
    return(
        <AnimationWrapper>
            <section className="h-cover flex justify-center gap-10">
                {/* latest blogs */}
                <div className="w-full">
                    <InPageNavigation routes={["home", "trending blogs"]} defaultHidden={["trending blogs"]}>
                        
                        <>
                            {
                                blogs == null ? <Loader/> 
                                :   blogs.results.length ? 
                                    blogs.results.map((blog, i) => {
                                    return <BlogPostCard content={blog} author={blog.author.personal_info}/>
                                })
                                : <NoDataMessage message = {"No Blogs Published"}/>
                            }
                            <LoadMoreDataBtn state={blogs} fetchDataFun={(pageState == "home" ? fetchLatestBlogs : fetchBlogByCategory)} />
                        </>
                        {
                                trendingblogs == null ? <Loader/> 
                                : trendingblogs.map((blog, i) => {
                                    return <BlogPostCard content={blog} author={blog.author.personal_info}/>
                                })                            
                        }
                    </InPageNavigation>
                </div>

                {/* filters and trending blogs */}
                <div className="min-w-[40%] lg-min-w-[400px] max-w-min border-l border-grey pl-8 pt-3 max-md:hidden">
                        <div className="flex flex-col gap-10">
                            <div>
                            <h1 className="font-medium text-xl mb-8">All Categories</h1>
                            <div className="flex gap-3 flex-wrap">
                                {
                                categories.map((category, i) => (
                                    <button
                                    onClick={loadBlogByCategory}
                                    className={"tag " + (pageState == category ? " bg-black text-white" : "")}
                                    key={i}
                                    >
                                    {category}
                                    </button>
                                ))
                                }
                            </div>
                            </div>
                        <div>
                            <h1 className="font-medium text-xl mb-8">Trending</h1>
                        </div>
                    </div>

                </div>
            </section>
        </AnimationWrapper>
    )
}

export default HomePage;